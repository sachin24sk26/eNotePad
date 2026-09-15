/**
 * eNotePad Cloud Functions v1.0
 * Automated TTL (Time-To-Live) Ephemeral Note Purge Engine
 *
 * Runs scheduled sweeps every 15 minutes to guarantee true ephemerality
 * across Firestore documents even when no client requests them.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * Scheduled Function: Runs every 15 minutes to delete expired shares.
 * Queries both timestamp-expired notes and burned single-read notes.
 */
exports.purgeExpiredNotes = functions.pubsub
  .schedule('every 15 minutes')
  .timeZone('UTC')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    console.log(`[TTL Engine] Starting scheduled purge at ${now.toDate().toISOString()}`);

    let totalDeleted = 0;

    try {
      // 1. Fetch expired notes based on timestamp
      const expiredSnapshot = await db
        .collection('shares')
        .where('expiresAt', '<=', now)
        .limit(500)
        .get();

      if (!expiredSnapshot.empty) {
        const batch = db.batch();
        expiredSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
          totalDeleted++;
        });
        await batch.commit();
        console.log(`[TTL Engine] Deleted ${expiredSnapshot.size} expired note document(s).`);
      }

      // 2. Fetch burned single-read notes that haven't been deleted yet
      const burnedSnapshot = await db
        .collection('shares')
        .where('burnAfterReading', '==', true)
        .where('burned', '==', true)
        .limit(200)
        .get();

      if (!burnedSnapshot.empty) {
        const burnBatch = db.batch();
        burnedSnapshot.forEach((doc) => {
          burnBatch.delete(doc.ref);
          totalDeleted++;
        });
        await burnBatch.commit();
        console.log(`[TTL Engine] Deleted ${burnedSnapshot.size} burned note document(s).`);
      }

      // 3. Log audit entry for monitoring
      if (totalDeleted > 0) {
        await db.collection('admin_logs').add({
          action: 'ttl_purge',
          details: `Automated TTL purge deleted ${totalDeleted} expired/burned document(s).`,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          source: 'cloud_function_scheduler'
        }).catch((err) => console.warn('[TTL Engine] Non-critical log write failure:', err));
      }

      console.log(`[TTL Engine] Sweep complete. Total cleaned: ${totalDeleted}`);
      return null;
    } catch (error) {
      console.error('[TTL Engine] Error during scheduled purge execution:', error);
      throw error;
    }
  });

/**
 * HTTPS Callable Function: Allows an authenticated Admin to trigger an on-demand TTL sweep.
 */
exports.manualPurgeExpired = functions.https.onCall(async (data, context) => {
  // Ensure caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to trigger manual purge.');
  }

  // Verify caller has admin role in Firestore
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const userData = userDoc.data();
  if (!userData || userData.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Administrator privileges required.');
  }

  const now = admin.firestore.Timestamp.now();
  const expiredSnapshot = await db
    .collection('shares')
    .where('expiresAt', '<=', now)
    .limit(500)
    .get();

  if (expiredSnapshot.empty) {
    return { success: true, count: 0, message: 'No expired notes found.' };
  }

  const batch = db.batch();
  expiredSnapshot.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return {
    success: true,
    count: expiredSnapshot.size,
    message: `Manually purged ${expiredSnapshot.size} expired note(s).`
  };
});
