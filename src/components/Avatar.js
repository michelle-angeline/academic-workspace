// Shows the user's profile photo, or their initials when they haven't uploaded one.
function Avatar({ user, className = '' }) {
  if (user?.profile_photo) {
    return <img className={className} src={user.profile_photo} alt="" />;
  }

  const initials = (user?.name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <span className={className} aria-hidden="true">
      {initials || '?'}
    </span>
  );
}

export default Avatar;
