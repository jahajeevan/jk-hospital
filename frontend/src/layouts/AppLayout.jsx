import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import Navbar from '../components/Navbar.jsx';
import ScrollProgress from '../components/ScrollProgress.jsx';
import { page3D } from '../utils/motion.js';

export default function AppLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <motion.div className="page-shell">
      <ScrollProgress />
      <Navbar />
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={location.pathname}
          className="page-route-shell"
          variants={page3D}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
      <Footer />
    </motion.div>
  );
}
