import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  runTransaction,
  writeBatch,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBoTqWwxqvShFpCXYsuHpcYNe4tThSFAOM',
  authDomain: 'madrasa-election-61f0e.firebaseapp.com',
  projectId: 'madrasa-election-61f0e',
  storageBucket: 'madrasa-election-61f0e.firebasestorage.app',
  messagingSenderId: '419103116922',
  appId: '1:419103116922:web:b85a6d7d3635fa4f3875c3',
  measurementId: 'G-3R0X2HTGK1'
};

const forceDemoMode = new URLSearchParams(window.location.search).has('demo');
const usingFirebase = !forceDemoMode && !firebaseConfig.apiKey.includes('PASTE_');
const demoStoreKey = 'madrasa-election-state-v1';
let db;

if (usingFirebase) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

const defaultState = {
  election: {
    status: 'ready',
    boothLocked: true,
    authorizedStudentId: null,
    authorizedAt: null,
    endsAt: Date.now() + 3 * 60 * 60 * 1000
  },
  candidates: [
    { id: 'boy-1', name: 'Ahmad Raza', gender: 'boy', photo: 'https://images.unsplash.com/photo-1594751543129-6701ad444259?auto=format&fit=crop&w=320&q=80' },
    { id: 'boy-2', name: 'Yusuf Karim', gender: 'boy', photo: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&w=320&q=80' },
    { id: 'girl-1', name: 'Fatima Noor', gender: 'girl', photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=320&q=80' },
    { id: 'girl-2', name: 'Aisha Siddiqua', gender: 'girl', photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=320&q=80' }
  ],
  students: [
    { id: '5-1', name: 'Hamza Ali', className: 'Class 5', roll: '1', gender: 'boy', voted: false },
    { id: '5-2', name: 'Maryam Akter', className: 'Class 5', roll: '2', gender: 'girl', voted: false },
    { id: '5-3', name: 'Omar Faruq', className: 'Class 5', roll: '3', gender: 'boy', voted: false },
    { id: '6-1', name: 'Zainab Rahman', className: 'Class 6', roll: '1', gender: 'girl', voted: false },
    { id: '6-2', name: 'Ibrahim Hasan', className: 'Class 6', roll: '2', gender: 'boy', voted: false },
    { id: '6-3', name: 'Sadia Islam', className: 'Class 6', roll: '3', gender: 'girl', voted: false }
  ],
  votes: []
};

let state = loadDemoState();
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadDemoState() {
  const saved = localStorage.getItem(demoStoreKey);
  return saved ? JSON.parse(saved) : structuredClone(defaultState);
}

function saveDemoState() {
  if (!usingFirebase) localStorage.setItem(demoStoreKey, JSON.stringify(state));
}

async function upsert(collectionName, item) {
  if (usingFirebase) return setDoc(doc(db, collectionName, item.id), item, { merge: true });
  const list = state[collectionName];
  const index = list.findIndex((entry) => entry.id === item.id);
  index >= 0 ? list.splice(index, 1, item) : list.push(item);
  saveDemoState();
  render();
}

async function patchElection(patch) {
  if (usingFirebase) return setDoc(doc(db, 'system', 'election'), patch, { merge: true });
  state.election = { ...state.election, ...patch };
  saveDemoState();
  render();
}

async function removeItem(collectionName, id) {
  if (usingFirebase) return deleteDoc(doc(db, collectionName, id));
  state[collectionName] = state[collectionName].filter((entry) => entry.id !== id);
  saveDemoState();
  render();
}

function setupFirebaseListeners() {
  if (!usingFirebase) return render();
  onSnapshot(collection(db, 'candidates'), (snapshot) => {
    state.candidates = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    render();
  });
  onSnapshot(collection(db, 'students'), (snapshot) => {
    state.students = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    render();
  });
  onSnapshot(collection(db, 'votes'), (snapshot) => {
    state.votes = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    render();
  });
  onSnapshot(doc(db, 'system', 'election'), (snapshot) => {
    if (snapshot.exists()) state.election = { ...state.election, ...snapshot.data() };
    render();
  });
}

function render() {
  renderBooth();
  renderOperator();
  renderStats();
  renderAdmin();
  renderResults();
}

function electionOpen() {
  return state.election.status === 'active';
}

function getAuthorizedStudent() {
  return state.students.find((student) => student.id === state.election.authorizedStudentId);
}

function renderBooth() {
  const student = getAuthorizedStudent();
  const unlocked = electionOpen() && !state.election.boothLocked && student && !student.voted;
  $('#lockedPanel').classList.toggle('hidden', unlocked);
  $('#voteForm').classList.toggle('hidden', !unlocked);
  $('#successPanel').classList.add('hidden');
  $('#boothStatus').textContent = unlocked ? 'Unlocked for authorized voter' : state.election.status === 'paused' ? 'Voting paused' : 'Waiting for operator authorization';
  $('#authorizedStudent').textContent = unlocked ? `${student.name} • ${student.className} • Roll ${student.roll}` : 'Please wait until your class and roll number are authorized.';

  const groups = [
    ['boy', 'Boy candidates section'],
    ['girl', 'Girl candidates section']
  ];
  $('#candidateGrid').innerHTML = groups.map(([gender, title]) => `
    <div class="candidate-section" data-group="${gender}">
      <h3>${title}</h3>
      ${state.candidates.filter((candidate) => candidate.gender === gender).slice(0, 2).map((candidate) => `
        <label class="candidate-option">
          <img src="${candidate.photo}" alt="${candidate.name}" />
          <strong>${candidate.name}</strong>
          <input class="sr-only" type="radio" name="${gender}" value="${candidate.id}" required />
          <span class="vote-button">Select</span>
        </label>
      `).join('')}
    </div>
  `).join('');
}

function renderOperator() {
  const classes = [...new Set(state.students.map((student) => student.className))].sort();
  const currentClass = $('#operatorClass').value || classes[0] || '';
  $('#operatorClass').innerHTML = classes.map((className) => `<option ${className === currentClass ? 'selected' : ''}>${className}</option>`).join('');
  const rolls = state.students.filter((student) => student.className === ($('#operatorClass').value || currentClass));
  const currentRoll = $('#operatorRoll').value || rolls[0]?.roll || '';
  $('#operatorRoll').innerHTML = rolls.map((student) => `<option value="${student.roll}" ${student.roll === currentRoll ? 'selected' : ''}>${student.roll} — ${student.name}</option>`).join('');
  $('#operatorNotice').textContent = state.election.status === 'paused' ? 'Emergency pause is active. Resume from Admin Panel.' : 'Select a student to begin.';
}

function getStats() {
  const total = state.students.length;
  const votedStudents = state.students.filter((student) => student.voted);
  const boys = votedStudents.filter((student) => student.gender === 'boy').length;
  const girls = votedStudents.filter((student) => student.gender === 'girl').length;
  const classes = [...new Set(state.students.map((student) => student.className))].sort().map((className) => {
    const students = state.students.filter((student) => student.className === className);
    const voted = students.filter((student) => student.voted).length;
    return { className, total: students.length, voted, percent: students.length ? Math.round((voted / students.length) * 100) : 0 };
  });
  return { total, voted: votedStudents.length, remaining: total - votedStudents.length, boys, girls, percent: total ? Math.round((votedStudents.length / total) * 100) : 0, classes };
}

function renderStats() {
  const stats = getStats();
  $('#totalVoted').textContent = stats.voted;
  $('#remainingStudents').textContent = stats.remaining;
  $('#boysTurnout').textContent = stats.boys;
  $('#girlsTurnout').textContent = stats.girls;
  $('#screenTotal').textContent = stats.voted;
  $('#screenRemaining').textContent = stats.remaining;
  $('#screenBoys').textContent = stats.boys;
  $('#screenGirls').textContent = stats.girls;
  $('#overallPercent').textContent = `${stats.percent}%`;
  $('#overallBar').style.width = `${stats.percent}%`;
  $('#classTracking').innerHTML = stats.classes.map(classBar).join('');
  $('#screenClassBars').innerHTML = stats.classes.map(classBar).join('');
}

function classBar(row) {
  return `<div class="class-row"><div class="row-top"><span>${row.className}</span><span>${row.voted}/${row.total} • ${row.percent}%</span></div><div class="progress"><i style="width:${row.percent}%"></i></div></div>`;
}

function renderAdmin() {
  $('#electionStateNotice').textContent = `Election status: ${state.election.status}`;
  $('#candidateList').innerHTML = state.candidates.map((candidate) => `
    <div class="list-item"><span><img src="${candidate.photo}" alt=""> <strong>${candidate.name}</strong> <small>${candidate.gender}</small></span><button data-remove-candidate="${candidate.id}">Remove</button></div>
  `).join('');
  $('#studentList').innerHTML = state.students.map((student) => `
    <div class="list-item"><span><strong>${student.name}</strong><br><small>${student.className} • Roll ${student.roll} • ${student.gender} • ${student.voted ? 'voted' : 'not voted'}</small></span><button data-remove-student="${student.id}">Remove</button></div>
  `).join('');
}

function renderResults() {
  const ended = state.election.status === 'ended';
  $('#resultsLock').classList.toggle('hidden', ended);
  $('#resultList').classList.toggle('hidden', !ended);
  if (!ended) return;
  const totals = state.candidates.map((candidate) => ({
    ...candidate,
    count: state.votes.filter((vote) => vote[candidate.gender] === candidate.id).length
  })).sort((a, b) => b.count - a.count);
  const winnerCount = totals[0]?.count ?? 0;
  $('#resultList').innerHTML = totals.map((candidate, index) => `
    <div class="list-item ${candidate.count === winnerCount && winnerCount > 0 ? 'result-winner' : ''}">
      <span><strong>${index === 0 ? 'Winner: ' : index === 1 ? 'Runner-up: ' : ''}${candidate.name}</strong><br><small>${candidate.gender} category</small></span>
      <strong>${candidate.count} votes</strong>
    </div>
  `).join('');
}

async function castVote(event) {
  event.preventDefault();
  const student = getAuthorizedStudent();
  const boy = new FormData(event.currentTarget).get('boy');
  const girl = new FormData(event.currentTarget).get('girl');
  if (!student || student.voted || !boy || !girl) return alert('Please select one boy candidate and one girl candidate.');

  const vote = { id: `vote-${student.id}`, studentId: student.id, boy, girl, createdAt: Date.now() };
  if (usingFirebase) {
    const studentRef = doc(db, 'students', student.id);
    await runTransaction(db, async (transaction) => {
      const studentSnap = await transaction.get(studentRef);
      if (!studentSnap.exists() || studentSnap.data().voted) throw new Error('This student has already voted.');
      transaction.set(doc(db, 'votes', vote.id), { ...vote, createdAt: serverTimestamp() });
      transaction.update(studentRef, { voted: true, votedAt: serverTimestamp() });
      transaction.set(doc(db, 'system', 'election'), { boothLocked: true, authorizedStudentId: null }, { merge: true });
    });
  } else {
    state.votes.push(vote);
    state.students = state.students.map((entry) => entry.id === student.id ? { ...entry, voted: true, votedAt: Date.now() } : entry);
    state.election = { ...state.election, boothLocked: true, authorizedStudentId: null };
    saveDemoState();
  }

  $('#voteForm').classList.add('hidden');
  $('#successPanel').classList.remove('hidden');
  $('#boothStatus').textContent = 'Vote recorded — locking booth';
  setTimeout(render, 2200);
}

async function authorizeStudent() {
  const className = $('#operatorClass').value;
  const roll = $('#operatorRoll').value;
  const student = state.students.find((entry) => entry.className === className && entry.roll === roll);
  if (!electionOpen()) return $('#operatorNotice').textContent = 'Election must be started before unlocking the booth.';
  if (!student) return $('#operatorNotice').textContent = 'Student not found.';
  if (student.voted) return $('#operatorNotice').textContent = 'Rejected: this student has already voted.';
  await patchElection({ boothLocked: false, authorizedStudentId: student.id, authorizedAt: Date.now() });
  $('#operatorNotice').textContent = `Booth unlocked for ${student.name}.`;
}

function bindEvents() {
  $$('.tab').forEach((tab) => tab.addEventListener('click', () => {
    $$('.tab, .app-section').forEach((entry) => entry.classList.remove('active'));
    tab.classList.add('active');
    $(`#${tab.dataset.section}`).classList.add('active');
  }));

  $('#candidateGrid').addEventListener('change', (event) => {
    if (event.target.type !== 'radio') return;
    $$(`input[name="${event.target.name}"]`).forEach((input) => input.closest('.candidate-option').classList.toggle('selected', input.checked));
  });
  $('#voteForm').addEventListener('submit', castVote);
  $('#unlockBtn').addEventListener('click', authorizeStudent);
  $('#pauseBtn').addEventListener('click', () => patchElection({ status: 'paused', boothLocked: true, authorizedStudentId: null }));
  $('#operatorClass').addEventListener('change', renderOperator);
  $('#loginBtn').addEventListener('click', () => {
    if ($('#adminPassword').value !== 'admin123') return alert('Invalid password');
    $('#adminLogin').classList.add('hidden');
    $('#adminDashboard').classList.remove('hidden');
  });
  $('#candidateForm').addEventListener('submit', (event) => {
    event.preventDefault();
    upsert('candidates', { id: crypto.randomUUID(), name: $('#candidateName').value, gender: $('#candidateGender').value, photo: $('#candidatePhoto').value });
    event.target.reset();
  });
  $('#studentForm').addEventListener('submit', (event) => {
    event.preventDefault();
    upsert('students', { id: crypto.randomUUID(), name: $('#studentName').value, className: $('#studentClass').value, roll: $('#studentRoll').value, gender: $('#studentGender').value, voted: false });
    event.target.reset();
  });
  document.addEventListener('click', (event) => {
    if (event.target.dataset.removeCandidate) removeItem('candidates', event.target.dataset.removeCandidate);
    if (event.target.dataset.removeStudent) removeItem('students', event.target.dataset.removeStudent);
  });
  $('#startElection').addEventListener('click', () => patchElection({ status: 'active', boothLocked: true, authorizedStudentId: null }));
  $('#adminPause').addEventListener('click', () => patchElection({ status: 'paused', boothLocked: true, authorizedStudentId: null }));
  $('#endElection').addEventListener('click', () => patchElection({ status: 'ended', boothLocked: true, authorizedStudentId: null }));
  $('#resetElection').addEventListener('click', resetElection);
}

async function resetElection() {
  if (!confirm('Reset all votes and student voted flags?')) return;
  if (usingFirebase) {
    const batch = writeBatch(db);
    state.votes.forEach((vote) => batch.delete(doc(db, 'votes', vote.id)));
    state.students.forEach((student) => batch.update(doc(db, 'students', student.id), { voted: false, votedAt: null }));
    batch.set(doc(db, 'system', 'election'), { status: 'ready', boothLocked: true, authorizedStudentId: null }, { merge: true });
    await batch.commit();
  } else {
    state.votes = [];
    state.students = state.students.map((student) => ({ ...student, voted: false, votedAt: null }));
    state.election = { ...state.election, status: 'ready', boothLocked: true, authorizedStudentId: null };
    saveDemoState();
    render();
  }
}

function updateCountdown() {
  const remaining = Math.max(0, (state.election.endsAt || Date.now()) - Date.now());
  const hours = String(Math.floor(remaining / 3600000)).padStart(2, '0');
  const minutes = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
  $('#countdown').textContent = `${hours}:${minutes}:${seconds}`;
}

bindEvents();
setupFirebaseListeners();
setInterval(updateCountdown, 1000);
updateCountdown();
