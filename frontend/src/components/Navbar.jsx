import { Activity, CalendarCheck, LayoutDashboard, LogOut, Mail, Menu, ShieldCheck, Stethoscope, UsersRound, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-medical-50 text-medical-600 shadow-[inset_0_0_0_1px_rgba(20,123,209,0.12)]' : 'text-slate-600 hover:bg-slate-50 hover:text-medical-600'}`;

  const links = user
    ? [
        ['/dashboard', LayoutDashboard, 'Patient'],
        ['/book', CalendarCheck, 'Book'],
        ['/doctors', UsersRound, 'Doctors'],
        ['/contact', Mail, 'Contact'],
        ['/services', Stethoscope, 'Services'],
        ...(isAdmin ? [['/admin', ShieldCheck, 'Admin']] : [])
      ]
    : [
        ['/', Activity, 'Home'],
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
      <div className="container-pad flex h-16 items-center justify-between">
        <Link to="/" className="magnetic-btn flex items-center gap-3 font-bold text-ink">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-medical-600 to-emerald-500 text-white shadow-[0_10px_24px_rgba(13,99,173,0.24)]">
            <Activity size={22} />
          </span>
          <span>JK Hospital</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map(([to, Icon, label]) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon className="mr-2 inline" size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-lg border border-slate-200 p-2 md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          {user ? (
            <button onClick={logout} className="btn-secondary hidden px-3 py-2 sm:inline-flex">
              <LogOut size={16} />
              Logout
            </button>
          ) : (
            <>
              <Link to="/login" className="btn-secondary hidden px-4 py-2 sm:inline-flex">
                Login
              </Link>
              <Link to="/signup" className="btn-primary hidden px-4 py-2 sm:inline-flex">
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
              {links.map(([to, Icon, label]) => (
                <NavLink key={to} to={to} className={linkClass} onClick={() => setOpen(false)}>
                  <Icon className="mr-2 inline" size={16} />
                  {label}
                </NavLink>
              ))}
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
