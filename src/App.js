import { useState } from 'react';
import SignIn from './pages/SignIn/SignIn';
import Register from './pages/Register/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Settings from './pages/Settings/Settings';

function App() {
  const [page, setPage] = useState('signin');
  const [user, setUser] = useState(null);

  const signOut = () => {
    setUser(null);
    setPage('signin');
  };

  const navigate = (next) => {
    setPage(next);
    window.scrollTo(0, 0);
  };

  if (page === 'settings' && user) {
    return <Settings user={user} onUserUpdated={setUser} onNavigate={navigate} onSignOut={signOut} />;
  }

  if (page === 'dashboard' && user) {
    return <Dashboard user={user} onNavigate={navigate} onSignOut={signOut} />;
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
