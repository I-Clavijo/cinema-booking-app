import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000';

function App() {
  const [userId, setUserId] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [screeningTime, setScreeningTime] = useState('');
  const [seats, setSeats] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loggedInUser = localStorage.getItem('userId');
    if (loggedInUser) {
      setUserId(loggedInUser);
      setIsAuthenticated(true);
      getBookings(loggedInUser);
    }
  }, []);

  useEffect(() => {
    let intervalId;

    if (isAuthenticated) {
      intervalId = setInterval(() => {
        getBookings(userId);
      }, 10000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAuthenticated, userId]);

  const handleRegister = async () => {
    if (!userId || !userPassword) {
      setAuthError('Please enter both username and password');
      return;
    }

    try {
      await axios.post(`${API_URL}/register`, { userId, userPassword });
      setIsAuthenticated(true);
      localStorage.setItem('userId', userId);
      setAuthError('');
      getBookings(userId);
    } catch (error) {
      setAuthError('Registration failed. Username might already exist.');
    }
  };

  const handleLogin = async () => {
    if (!userId || !userPassword) {
      setAuthError('Please enter both username and password');
      return;
    }

    try {

      const response = await axios.post(`${API_URL}/login`, { userId, userPassword });
      setIsAuthenticated(true);
      localStorage.setItem('userId', userId);
      setAuthError('');
      getBookings(userId);
    } catch (error) {
      setAuthError('Login failed. Please check your credentials.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('userId');
    setUserId('');
    setUserPassword('');
    setBookings([]);
    setIsRegistering(true);
  };

  const handleBook = async () => {
    if (!screeningTime || seats.length === 0 || seats[0] === '') {
      alert('Please select both screening time and number of seats');
      return;
    }

    try {
      await axios.post(`${API_URL}/book`, {
        userId,
        screeningTime,
        seats,
      });

      alert('Please confirm your booking. Your booking will be saved for 15 minutes.');

      // Clear form fields after successful booking
      setScreeningTime('');
      setSeats([]);

      // Refresh bookings list
      getBookings(userId);
    } catch (error) {
      alert('Booking failed');
    }
  };

  const handleConfirm = async (bookingId) => {
    try {
      await axios.post(`${API_URL}/confirm/${bookingId}`);
      alert("Booking Confirmed");
      getBookings(userId);
    } catch (err) {
      alert("Confirmation failed");
    }
  }

  const handleDelete = async (bookingId) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      setIsDeleting(true);
      try {
        await axios.delete(`${API_URL}/bookings/${bookingId}`);
        alert('Booking deleted successfully');
        getBookings(userId);
      } catch (error) {
        if (error.response && error.response.status === 400) {
          alert(error.response.data.message || 'Only pending bookings can be deleted');
        } else {
          alert('Failed to delete booking');
        }
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const getBookings = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/bookings/${id || userId}`);
      setBookings(response.data);
    } catch (err) {
      alert("Error getting bookings");
    }
  }

  // Authentication page (Registration/Login)
  const renderAuthPage = () => (
    <div className="auth-container">
      <h2>{isRegistering ? 'Register' : 'Login'}</h2>
      {authError && <div className="error-message">{authError}</div>}
      <div className="form-group">
        <label>Username</label>
        <input
          type="text"
          placeholder="Enter Username"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Password</label>
        <input
          type="password"
          placeholder="Enter Password"
          value={userPassword}
          onChange={(e) => setUserPassword(e.target.value)}
        />
      </div>
      <div className="auth-buttons">
        {isRegistering ? (
          <>
            <button onClick={handleRegister}>Register</button>
            <p>
              Already have an account?{' '}
              <button onClick={() => setIsRegistering(false)}>Login</button>
            </p>
          </>
        ) : (
          <>
            <button onClick={handleLogin}>Login</button>
            <p>
              Don't have an account?{' '}
              <button onClick={() => setIsRegistering(true)}>Register</button>
            </p>
          </>
        )}
      </div>
    </div>
  );

  const renderBookingPage = () => (
    <div className="booking-container">
      <div className="user-info">
        <h3>Welcome, {userId}</h3>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <div className="booking-form">
        <h3>Book a Screening</h3>
        <div className="form-group">
          <label>Screening Time</label>
          <div className="button-group">
            {['14:00', '15:00', '16:00', '17:00'].map(time => (
              <button
                key={time}
                className={screeningTime === time ? 'time-btn selected' : 'time-btn'}
                onClick={() => setScreeningTime(time)}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Number of Seats</label>
          <div className="button-group">
            {[1, 2, 3, 4].map(number => (
              <button
                key={number}
                className={seats.join(',') === String(number) ? 'seat-btn selected' : 'seat-btn'}
                onClick={() => setSeats([String(number)])}
              >
                {number}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleBook}>Book</button>
      </div>

      <div className="bookings-list">
        <h3>Your Bookings</h3>
        {bookings.length > 0 ? (
          <ul>
            {bookings.map((booking) => (
              <li key={booking._id}>
                <div className="booking-info">
                  Screening: {booking.screeningTime}, Seats: {booking.seats.join(', ')}, Status: {booking.status}
                </div>
                {booking.status === 'pending' && (
                  <div className="booking-actions">
                    <button
                      className="confirm-btn"
                      onClick={() => handleConfirm(booking._id)}
                    >
                      Confirm
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(booking._id)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No bookings found.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <h1>Cinema Booking System</h1>
      {isAuthenticated ? renderBookingPage() : renderAuthPage()}
    </div>
  );
}

export default App;