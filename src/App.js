import { useState } from 'react';
import SignIn from './pages/SignIn/SignIn';
import Register from './pages/Register/Register';
import Dashboard from './pages/Dashboard/Dashboard';

function App() {
  const [page, setPage] = useState('signin');
  const [user, setUser] = useState(null);

  if (page === 'dashboard' && user) {
    return (
      <Dashboard
        user={user}
        onSignOut={() => {
          setUser(null);
          setPage('signin');
        }}
      />
    );
  }

  if (page === 'register') {
    return (
      <Register
        onRegistered={(newUser) => {
          alert(`Workspace created for ${newUser.email}`);
          setPage('signin');
        }}
        onSignIn={() => setPage('signin')}
      />
    );
  }

  return (
    <SignIn
      onSignedIn={(signedInUser) => {
        setUser(signedInUser);
        setPage('dashboard');
      }}
      onCreateAccount={() => setPage('register')}
    />
  );
}

export default App;
