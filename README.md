# Madrasa Election Platform

A responsive, professional digital election web application for a madrasa or school election. The app is built with HTML, CSS, JavaScript, and optional Firebase Firestore synchronization.

## Sections

1. **Voting Booth** — a fullscreen, distraction-free student voting screen. Students only see boy candidates, girl candidates, photos, names, vote buttons, and a submit button. The booth requires exactly one boy and one girl selection, shows a success message, then locks again.
2. **Control Center** — an operator dashboard for teachers to select a class and roll number, reject duplicate voters, unlock the booth, pause voting, and monitor attendance.
3. **Live Screening Display** — a projector/TV-safe display that shows turnout percentages, class-wise progress, turnout by gender, total voted, remaining students, and a countdown timer. Candidate vote totals are never displayed here.
4. **Admin Panel** — password-protected administration for candidates, students, election state, reset controls, and final result viewing after the election ends.

## Appearance

The interface uses a clean institutional design instead of an Islamic visual theme. Users can switch between light mode and dark mode from the header, and the selected theme is saved in the browser.

## Firebase setup

The app is configured for the `madrasa-election-61f0e` Firebase project in `app.js` and uses Firestore for realtime synchronization by default. To use a different Firebase project:

1. Create a Firebase project and Firestore database.
2. Open `app.js`.
3. Replace the values in `firebaseConfig` with your project credentials.
4. Host the static files on Firebase Hosting or any static web server.

For offline demonstrations without Firebase, open the app with `?demo=true`; this uses browser `localStorage` instead of Firestore.

## Demo admin password

`admin123`

Change this before production deployment and enforce real Firebase Authentication plus Firestore Security Rules for live elections.

## Firestore collections

- `candidates/{candidateId}`
- `students/{studentId}`
- `votes/{voteId}`
- `system/election`

## Local run

Use any static server, for example:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`. For local demo storage, open `http://localhost:4173?demo=true`.

## Security rules

A starter Firestore ruleset is included in `firestore.rules`. For a live election, pair it with Firebase Authentication custom claims for `admin` and `operator` roles.
