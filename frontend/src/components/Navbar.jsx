import { UserButton } from '@clerk/clerk-react';
import { Activity, Bot, CalendarCheck, LayoutDashboard, LogOut, Mail, Menu, ShieldCheck, Stethoscope, UsersRound, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo.jsx';
import { LiquidButton } from './ui/liquid-glass-button';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const liquidNavLabels = new Set(['Home', 'Patient', 'Book', 'AI', 'Doctors', 'Services', 'Contact', 'Admin']);
  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-white/60 text-medical-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_10px_24px_rgba(13,99,173,0.1)] ring-1 ring-medical-200/70 backdrop-blur-xl' : 'text-slate-600 hover:bg-white/50 hover:text-medical-700 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] hover:backdrop-blur-xl'}`;
  const isActivePath = (to) => location.pathname === to;
  const handleLiquidNav = (to) => {
    navigate(to);
    setOpen(false);
  };

  const links = user
    ? [
        ['/dashboard', LayoutDashboard, 'Patient'],
        ['/book', CalendarCheck, 'Book'],
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
          <button type="button" className="rounded-lg border border-white/70 bg-white/55 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          {user ? (
            <>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'h-10 w-10 rounded-xl shadow-[0_10px_24px_rgba(13,99,173,0.18)]',
                    userButtonPopoverCard: 'rounded-2xl border border-slate-200 shadow-[0_24px_80px_rgba(8,47,73,0.16)]'
                  }
                }}
              />
              <button onClick={logout} className="btn-secondary hidden px-3 py-2 md:inline-flex">
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-auth-link btn-secondary hidden px-4 py-2 min-[520px]:inline-flex">
                Login
              </Link>
              <Link to="/signup" className="nav-auth-link btn-primary hidden whitespace-nowrap px-4 py-2 min-[520px]:inline-flex">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-200 md:hidden"
          >
            <div className="container-pad flex flex-col gap-2 py-4">
              {links.map(([to, Icon, label]) =>
                liquidNavLabels.has(label) ? (
                  <LiquidButton
                    key={to}
                    type="button"
                    size="lg"
                    className={`liquid-nav-button ${linkClass({ isActive: isActivePath(to) })} w-full justify-start`}
                    onClick={() => handleLiquidNav(to)}
                    aria-current={isActivePath(to) ? 'page' : undefined}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon size={16} />
                      {label}
                    </span>
                  </LiquidButton>
                ) : (
                  <NavLink key={to} to={to} className={linkClass} onClick={() => setOpen(false)}>
                    <Icon className="mr-2 inline" size={16} />
                    {label}
                  </NavLink>
                )
              )}
              {user ? (
                <button onClick={logout} className="btn-secondary w-full">Logout</button>
              ) : (
                <>
                  <Link to="/login" className="btn-secondary w-full" onClick={() => setOpen(false)}>Login</Link>
                  <Link to="/signup" className="btn-primary w-full" onClick={() => setOpen(false)}>Sign up</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
