import { useEffect, useState } from 'react';
import SignIn from './pages/SignIn/SignIn';
import Register from './pages/Register/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Settings from './pages/Settings/Settings';
import NewWorkspace from './pages/NewWorkspace/NewWorkspace';
import { listWorkspaces } from './services/workspaces';

function App() {
  const [page, setPage] = useState('signin');
  const [user, setUser] = useState(null);
  // The signed-in user's workspaces for the sidebar; null until loaded
  const [workspaces, setWorkspaces] = useState(null);

  const userId = user?.user_id;
  useEffect(() => {
    if (userId === undefined) return undefined;
    let cancelled = false;
    listWorkspaces(userId)
      .then((rows) => !cancelled && setWorkspaces(rows))
      .catch(() => !cancelled && setWorkspaces([]));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signOut = () => {
    setUser(null);
    setWorkspaces(null);
    setPage('signin');
  };

  const addWorkspace = (workspace) => setWorkspaces((list) => [...(list || []), workspace]);

  const navigate = (next) => {
    setPage(next);
    window.scrollTo(0, 0);
  };

  if (page === 'settings' && user) {
    return (
      <Settings user={user} workspaces={workspaces} onUserUpdated={setUser} onNavigate={navigate} onSignOut={signOut} />
    );
  }

  if (page === 'new-workspace' && user) {
    return (
      <NewWorkspace
        user={user}
        workspaces={workspaces}
        onWorkspaceCreated={addWorkspace}
        onNavigate={navigate}
        onSignOut={signOut}
      />
    );
  }

  if (page === 'dashboard' && user) {
    return <Dashboard user={user} workspaces={workspaces} onNavigate={navigate} onSignOut={signOut} />;
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
