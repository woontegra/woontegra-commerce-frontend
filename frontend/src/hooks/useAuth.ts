import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import api from '../services/api';

export function useAuth() {
  const navigate = useNavigate();
  const { user, setUser, setTenant } = useAppStore();
  const hasFetched = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch user data only once on mount
    if (!user && !hasFetched.current) {
      hasFetched.current = true;
      console.log('useAuth: fetching user data once');
      fetchUserData();
    }
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      
      if (response.data.tenant) {
        setTenant(response.data.tenant);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  return { user, setUser };
}
