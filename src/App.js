import { useState } from 'react';
import SignIn from './pages/SignIn/SignIn';
import Register from './pages/Register/Register';

function App() {
  const [page, setPage] = useState('signin');

  if (page === 'register') {
    return (
      <Register
        onRegistered={(user) => {
          alert(`Workspace created for ${user.email}`);
          setPage('signin');
        }}
        onSignIn={() => setPage('signin')}
      />
    );
  }

  return (
    <SignIn
      onSignedIn={(user) => alert(`Signed in as ${user.email}`)}
      onCreateAccount={() => setPage('register')}
    />
  );
}

export default App;
