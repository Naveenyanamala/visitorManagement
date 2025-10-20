import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, userType, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Avoid re-initializing if a socket already exists
      if (socket) return;
      // Initialize socket connection
      const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:8090', {
        auth: {
          token: localStorage.getItem('token'),
        },
        transports: ['websocket'],
        upgrade: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
        
        // Join user-specific rooms
        if (userType === 'member') {
          newSocket.emit('join-member', user.id);
          
          // Join company rooms for this member
          if (user.companies) {
            user.companies.forEach(company => {
              if (company.isActive) {
                newSocket.emit('join-company', company.company._id || company.company);
              }
            });
          }
        } else if (userType === 'admin') {
          // Admin can join all company rooms
          newSocket.emit('join-company', 'all');
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // Listen for new requests (for members)
      newSocket.on('new-request', (data) => {
        if (userType === 'member') {
          toast.success(`New visitor request from ${data.request.visitor.firstName} ${data.request.visitor.lastName}`, {
            duration: 6000,
          });
        }
      });

      // Listen for request updates (for all users)
      newSocket.on('request-update', (data) => {
        const { type, request } = data;
        
        switch (type) {
          case 'new':
            if (userType === 'admin') {
              toast.info(`New request from ${request.visitor.firstName} ${request.visitor.lastName}`, {
                duration: 4000,
              });
            }
            break;
          case 'status-change':
            toast.success(`Request status updated to ${request.status}`, {
              duration: 4000,
            });
            break;
          case 'entry':
            toast.success(`Visitor ${request.visitor?.firstName} has entered`, {
              duration: 4000,
            });
            break;
          case 'exit':
            toast.success(`Visitor ${request.visitor?.firstName} has exited`, {
              duration: 4000,
            });
            break;
          case 'cancelled':
            toast.warning('A request has been cancelled', {
              duration: 4000,
            });
            break;
          default:
            break;
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    } else {
      // Disconnect socket if user is not authenticated
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, user, userType]);

  const emit = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const joinRoom = (roomName) => {
    if (socket && isConnected) {
      socket.emit('join-company', roomName);
    }
  };

  const leaveRoom = (roomName) => {
    if (socket && isConnected) {
      socket.emit('leave-company', roomName);
    }
  };

  const value = {
    socket,
    isConnected,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
