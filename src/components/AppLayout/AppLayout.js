import { WORKSPACES } from '../../data/workspaces';
import Avatar from '../Avatar';
import {
  BellIcon,
  CalendarIcon,
  GraduationCapIcon,
  LayoutIcon,
  LogOutIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SproutIcon,
} from '../Icons';
import './AppLayout.css';

// Sidebar + top bar shared by every signed-in page. `active` is the current page name.
function AppLayout({ user, active, onNavigate, onSignOut, children }) {
  const fullName = user?.name?.trim() || 'Student';

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
          {WORKSPACES.map((w) => (
            <a key={w.id} href={`#${w.id}`} className="dash-nav__workspace">
              <span className="dash-dot" style={{ background: w.color }} />
              {w.name}
            </a>
          ))}

          <a href="#alerts" className="dash-nav__item dash-nav__item--alerts">
            <BellIcon width={18} height={18} />
            Early Alerts
            <span className="dash-nav__count">4</span>
          </a>
          <a href="#reflection" className="dash-nav__item">
            <SproutIcon width={18} height={18} />
            Weekly Reflection
            <span className="dash-nav__due">Sunday Due</span>
          </a>
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
          <span className="dash-chip dash-chip--semester">
            <CalendarIcon width={14} height={14} />
            Semester 6 • Week 8
          </span>
          <button type="button" className="dash-new-task">
            <PlusIcon width={16} height={16} />
            New Task
          </button>
          <button type="button" className="dash-icon-btn dash-bell" aria-label="Notifications">
            <BellIcon width={19} height={19} />
            <span className="dash-bell__dot" />
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
