import { AnimatePresence, motion } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import Navbar from '../components/Navbar.jsx';
import ScrollProgress from '../components/ScrollProgress.jsx';
import { page3D } from '../utils/motion.js';

export default function AppLayout() {
  const location = useLocation();

  return (
    <motion.div className="page-shell scene-3d">
      <ScrollProgress />
      <Navbar />
      <AnimatePresence mode="wait">
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
