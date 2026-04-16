import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider } from './context/AuthContext';
import { VmProvider } from './context/VmContext';

export const App: React.FC = () => (
  <AuthProvider>
    <VmProvider>
      <RouterProvider router={router} />
    </VmProvider>
  </AuthProvider>
);
