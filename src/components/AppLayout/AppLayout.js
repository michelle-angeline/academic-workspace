import useAlertCount from '../../hooks/useAlertCount';
import useReflectionSubmitted from '../../hooks/useReflectionSubmitted';
import Avatar from '../Avatar';
import {
  BellIcon,
  GraduationCapIcon,
  LayoutIcon,
  LogOutIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SproutIcon,
} from '../Icons';
import './AppLayout.css';

// Sidebar + top bar shared by every signed-in page. `active` is the current page name;
// `workspaces` is the signed-in user's workspaces from the database (null while loading);
// `activeWorkspaceId` highlights the open workspace on the Workspace page.
function AppLayout({ user, workspaces, active, activeWorkspaceId, onNavigate, onSignOut, children }) {
  const fullName = user?.name?.trim() || 'Student';
  const alertCount = useAlertCount(workspaces);
  const reflectionSubmitted = useReflectionSubmitted(user);

  return (
    <div className="dash-page">
      {/* ---------- Sidebar ---------- */}
      <aside className="dash-sidebar">
        <div className="dash-logo">
          <span className="dash-logo__mark">
            <GraduationCapIcon width={20} height={20} />
          </span>
          <span>
            <span className="dash-logo__name">Athena</span>
            <span className="dash-logo__tagline">Academic Workspace</span>
          </span>
        </div>

        <nav className="dash-nav">
          <button
            type="button"
            className={`dash-nav__item ${active === 'dashboard' ? 'dash-nav__item--active' : ''}`}
            onClick={() => onNavigate('dashboard')}
          >
            <LayoutIcon width={18} height={18} />
            Dashboard
          </button>

          <p className="dash-nav__heading">Workspaces</p>
          {workspaces?.map((w) => {
            const isOpen = active === 'workspace' && activeWorkspaceId === w.workspace_id;
            return (
              <button
                key={w.workspace_id}
                type="button"
                className={`dash-nav__workspace ${isOpen ? 'dash-nav__workspace--active' : ''}`}
                title={w.workspace_name}
                aria-current={isOpen ? 'page' : undefined}
                onClick={() => onNavigate('workspace', w.workspace_id)}
              >
                <span className="dash-dot dash-dot--workspace" />
                <span className="dash-nav__workspace-name">{w.workspace_name}</span>
              </button>
            );
          })}
          {workspaces?.length === 0 && (
            <button type="button" className="dash-nav__empty" onClick={() => onNavigate('new-workspace')}>
              No workspaces yet. <span>Create one</span>
            </button>
          )}

          <button
            type="button"
            className={`dash-nav__item dash-nav__item--alerts ${active === 'early-alerts' ? 'dash-nav__item--active' : ''}`}
            aria-current={active === 'early-alerts' ? 'page' : undefined}
            onClick={() => onNavigate('early-alerts')}
          >
            <BellIcon width={18} height={18} />
            Early Alerts
            {alertCount !== null && (
              <span
                className={`dash-nav__count ${alertCount === 0 ? 'dash-nav__count--zero' : ''}`}
                aria-label={`${alertCount} early alert${alertCount === 1 ? '' : 's'}`}
              >
                {alertCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`dash-nav__item ${active === 'weekly-reflection' ? 'dash-nav__item--active' : ''}`}
            aria-current={active === 'weekly-reflection' ? 'page' : undefined}
            onClick={() => onNavigate('weekly-reflection')}
          >
            <SproutIcon width={18} height={18} />
            Weekly Reflection
            {reflectionSubmitted === false && <span className="dash-nav__due">Sunday Due</span>}
          </button>
        </nav>

        <div className="dash-profile">
          <Avatar user={user} className="dash-profile__avatar" />
          <span className="dash-profile__info">
            <span className="dash-profile__name">{fullName}</span>
            <span className="dash-profile__meta">CS, Year 3</span>
          </span>
          <button
            type="button"
            className={`dash-icon-btn ${active === 'settings' ? 'dash-icon-btn--active' : ''}`}
            aria-label="Profile & settings"
            aria-current={active === 'settings' ? 'page' : undefined}
            onClick={() => onNavigate('settings')}
          >
            <SettingsIcon width={17} height={17} />
          </button>
          <button type="button" className="dash-icon-btn" aria-label="Sign out" onClick={onSignOut}>
            <LogOutIcon width={17} height={17} />
          </button>
        </div>
      </aside>

      {/* ---------- Main column ---------- */}
      <div className="dash-main">
        <header className="dash-topbar">
          <label className="dash-search">
            <SearchIcon width={17} height={17} />
            <input type="search" placeholder="Search" />
          </label>
          <button type="button" className="dash-new-task" onClick={() => onNavigate('new-workspace')}>
            <PlusIcon width={16} height={16} />
            New Workspace
          </button>
          <button
            type="button"
            className="dash-icon-btn dash-bell"
            aria-label={alertCount ? `Early alerts (${alertCount})` : 'Early alerts'}
            onClick={() => onNavigate('early-alerts')}
          >
            <BellIcon width={19} height={19} />
            {alertCount > 0 && <span className="dash-bell__dot" />}
          </button>
          <button
            type="button"
            className="dash-topbar__avatar"
            aria-label="Profile & settings"
            onClick={() => onNavigate('settings')}
          >
            <Avatar user={user} />
          </button>
        </header>

        {children}
      </div>
    </div>
  );
}

export default AppLayout;
