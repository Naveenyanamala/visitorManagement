import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const initialState = {
  user: null,
  userType: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        userType: action.payload.userType,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        userType: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        userType: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set up axios interceptor for token
  useEffect(() => {
    if (state.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [state.token]);

  // Verify token on app load
  useEffect(() => {
    const verifyToken = async () => {
      if (state.token) {
        try {
          const response = await axios.get('/api/auth/verify');
          if (response.data.success) {
            // Get user profile
            const profileResponse = await axios.get('/api/auth/me');
            if (profileResponse.data.success) {
              const profUser = profileResponse.data.data.user;
              const normalizedUser = { ...profUser, id: profUser.id || profUser._id };
              dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {
                  user: normalizedUser,
                  userType: profileResponse.data.data.userType,
                  token: state.token,
                },
              });
            } else {
              throw new Error('Failed to get user profile');
            }
          } else {
            throw new Error('Token verification failed');
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('token');
          dispatch({ type: 'LOGIN_FAILURE' });
        }
      } else {
        dispatch({ type: 'LOGIN_FAILURE' });
      }
    };

    verifyToken();
  }, [state.token]);

  const login = async (email, password, userType) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const response = await axios.post(`/api/auth/${userType}/login`, {
        email,
        password,
      });

      if (response.data.success) {
        const { token, user } = response.data.data;
        localStorage.setItem('token', token);
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user,
            userType,
            token,
          },
        });

        toast.success('Login successful!');
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      toast.error(message);
      dispatch({ type: 'LOGIN_FAILURE' });
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      dispatch({ type: 'LOGOUT' });
      toast.success('Logged out successfully');
    }
  };

  const updateUser = (userData) => {
    dispatch({
      type: 'UPDATE_USER',
      payload: userData,
    });
  };

  const hasPermission = (permission) => {
    if (state.userType === 'member') {
      return true; // Members have basic permissions
    }
    
    if (state.userType === 'admin') {
      if (state.user.role === 'super_admin') {
        return true; // Super admin has all permissions
      }
      return state.user.permissions?.[permission] || false;
    }
    
    return false;
  };

  const value = {
    ...state,
    login,
    logout,
    updateUser,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
