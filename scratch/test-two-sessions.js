const config = {
  apiKey: "AIzaSyDJ7dcrHRzi0xTncTHUHfmJAXK3JlzZ4-I",
  databaseURL: "https://ml-assignment-20d62-default-rtdb.asia-southeast1.firebasedatabase.app"
};

async function authenticateAnonymousUser() {
  const authUrl = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + config.apiKey;
  const res = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true })
  });
  if (!res.ok) {
    throw new Error('Auth failed: ' + res.status + ' ' + (await res.text()));
  }
  return await res.json();
}

async function runTwoSessionTest() {
  console.log('=== TEST 1: Authenticating Session 1 & Session 2 ===');
  const user1 = await authenticateAnonymousUser();
  console.log('Session 1 Authenticated UID:', user1.localId);
  
  const user2 = await authenticateAnonymousUser();
  console.log('Session 2 Authenticated UID:', user2.localId);

  console.log('\n=== TEST 2: Attempting Presence Operations on Firebase RTDB ===');
  const s1Key = 'session_tab_1_' + Date.now();
  const s1Url = config.databaseURL + '/presence/sessions/' + s1Key + '.json?auth=' + user1.idToken;

  const writeRes1 = await fetch(s1Url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: user1.localId,
      joinedAt: Date.now(),
      lastActive: Date.now()
    })
  });

  console.log('Session 1 write HTTP status:', writeRes1.status);
  const writeData1 = await writeRes1.json();
  console.log('Session 1 write response:', writeData1);

  const readUrl = config.databaseURL + '/presence/sessions.json?auth=' + user1.idToken;
  const readRes = await fetch(readUrl);
  console.log('Read presence/sessions HTTP status:', readRes.status);
  const readData = await readRes.json();
  console.log('Read presence/sessions response:', readData);

  return {
    authWorking: true,
    rulesPublished: writeRes1.status === 200 && readRes.status === 200,
    writeStatus: writeRes1.status,
    readStatus: readRes.status,
    response: readData
  };
}

runTwoSessionTest().then(res => {
  console.log('\n=== SUMMARY OF REAL DIAGNOSTIC ===');
  console.log(JSON.stringify(res, null, 2));
}).catch(console.error);
