import { UserButton } from '@clerk/clerk-react';
import { Activity, Bot, BriefcaseMedical, CalendarCheck, LayoutDashboard, LogOut, Mail, Menu, ShieldCheck, Stethoscope, UsersRound, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo.jsx';
import { LiquidButton } from './ui/liquid-glass-button';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const liquidNavLabels = new Set(['Home', 'Patient', 'Book', 'Staff', 'AI', 'Doctors', 'Services', 'Contact', 'Admin']);
  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-white/60 text-medical-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_10px_24px_rgba(13,99,173,0.1)] ring-1 ring-medical-200/70 backdrop-blur-xl' : 'text-slate-600 hover:bg-white/50 hover:text-medical-700 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] hover:backdrop-blur-xl'}`;
  const isActivePath = (to) => location.pathname === to;
  const handleLiquidNav = (to) => {
    navigate(to);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return undefined;

    const scrollY = window.scrollY;
    const { style } = document.body;
    const previous = {
      left: style.left,
      overflow: style.overflow,
      position: style.position,
      right: style.right,
      top: style.top,
      width: style.width
    };

    document.body.classList.add('mobile-nav-open');
    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.left = '0';
    style.right = '0';
    style.width = '100%';
    style.overflow = 'hidden';

    return () => {
      document.body.classList.remove('mobile-nav-open');
      style.position = previous.position;
      style.top = previous.top;
      style.left = previous.left;
      style.right = previous.right;
      style.width = previous.width;
      style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const links = user
    ? [
        ['/dashboard', LayoutDashboard, 'Patient'],
        ['/book', CalendarCheck, 'Book'],
        ['/staff', BriefcaseMedical, 'Staff'],
        ['/ai', Bot, 'AI'],
        ['/doctors', UsersRound, 'Doctors'],
        ['/contact', Mail, 'Contact'],
        ['/services', Stethoscope, 'Services'],
        ...(isAdmin ? [['/admin', ShieldCheck, 'Admin']] : [])
      ]
    : [
        ['/', Activity, 'Home'],
        ['/ai', Bot, 'AI'],
        ['/doctors', UsersRound, 'Doctors'],
        ['/services', Stethoscope, 'Services'],
        ['/contact', Mail, 'Contact']
      ];

  return (
    <>
      <motion.header
        className="liquid-nav sticky top-0 z-40"
        initial={{ y: -18, opacity: 0, rotateX: -6 }}
        animate={{ y: 0, opacity: 1, rotateX: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformPerspective: 1200 }}
      >
        <div className="container-pad flex h-16 items-center justify-between gap-3">
          <Link to="/" className="magnetic-btn min-w-0 shrink-0 text-ink" aria-label="JK Hospital home">
            <span className="hidden min-[380px]:inline-flex">
              <BrandLogo className="navbar-brand" />
            </span>
            <span className="inline-flex min-[380px]:hidden">
              <BrandLogo compact markSize="sm" />
            </span>
          </Link>
          <nav className="hidden min-w-0 items-center gap-1 md:flex">
            {links.map(([to, Icon, label]) =>
              liquidNavLabels.has(label) ? (
                <LiquidButton
                  key={to}
                  type="button"
                  size="sm"
                  className={`liquid-nav-button ${linkClass({ isActive: isActivePath(to) })}`}
                  onClick={() => handleLiquidNav(to)}
                  aria-current={isActivePath(to) ? 'page' : undefined}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon size={16} />
                    {label}
                  </span>
                </LiquidButton>
              ) : (
                <NavLink key={to} to={to} className={linkClass}>
                  <Icon className="mr-2 inline" size={16} />
                  {label}
                </NavLink>
              )
            )}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {!user ? (
              <button type="button" className="hidden rounded-lg border border-white/70 bg-white/55 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Menu">
                {open ? <X size={20} /> : <Menu size={20} />}
              </button>
            ) : null}
            {user ? (
              <>
                <button onClick={logout} className="mobile-top-logout">
                  <LogOut size={16} />
                  Logout
                </button>
                <div className="hidden md:flex md:items-center md:gap-2">
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: 'h-10 w-10 rounded-xl shadow-[0_10px_24px_rgba(13,99,173,0.18)]',
                        userButtonPopoverCard: 'rounded-2xl border border-slate-200 shadow-[0_24px_80px_rgba(8,47,73,0.16)]'
                      }
                    }}
                  />
                  <button onClick={logout} className="btn-secondary px-3 py-2">
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary nav-direct-auth px-3 py-2">
                  Login
                </Link>
                <Link to="/signup" className="btn-primary nav-direct-auth whitespace-nowrap px-3 py-2">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.header>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="mobile-nav-backdrop md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mobile-nav-sheet md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
            >
              <nav className="mobile-nav-list">
                {links.map(([to, Icon, label]) =>
                  liquidNavLabels.has(label) ? (
                    <button
                      key={to}
                      type="button"
                      className={`mobile-nav-item ${isActivePath(to) ? 'active' : ''}`}
                      onClick={() => handleLiquidNav(to)}
                      aria-current={isActivePath(to) ? 'page' : undefined}
                    >
                      <span className="mobile-nav-icon"><Icon size={18} /></span>
                      <span>{label}</span>
                    </button>
                  ) : (
                    <NavLink key={to} to={to} className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}>
                      <span className="mobile-nav-icon"><Icon size={18} /></span>
                      <span>{label}</span>
                    </NavLink>
                  )
                )}
              </nav>
              <div className="mobile-nav-actions">
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                    className="mobile-nav-action danger"
                  >
                    <LogOut size={17} />
                    Logout
                  </button>
                ) : (
                  <>
                    <Link to="/login" className="mobile-nav-action secondary" onClick={() => setOpen(false)}>Login</Link>
                    <Link to="/signup" className="mobile-nav-action primary" onClick={() => setOpen(false)}>Sign up</Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
