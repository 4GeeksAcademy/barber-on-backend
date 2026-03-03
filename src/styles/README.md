# 💈 BarberOn
Full Stack Barber Booking Platform

BarberOn is a full-stack web application that allows users to discover nearby barbershops, book appointments, manage reservations, and explore grooming products — all in a modern, mobile-first interface.

---

## 🚨 Problem

Many barbershops still manage appointments manually via phone calls or Instagram messages.  
This creates inefficiencies, missed bookings, and poor customer experience.

---

## 💡 Solution

BarberOn solves this by providing:

- Location-based barber discovery
- Real-time booking system
- Reservation management
- Secure authentication with JWT
- Booking history tracking
- Booking cancellation system

---

## 🎯 Target Users

- Clients looking to book haircuts easily
- Barbers who want to manage appointments digitally

---

# 🚀 MVP (Minimum Viable Product)

The current version includes:

### 🔐 Authentication
- User registration
- Login with JWT
- Persistent session (auto-login)
- Secure logout

### 📍 Barber Discovery
- Display nearby barbers using geolocation
- Google Places API integration
- Search functionality

### 📅 Booking System
- Create booking
- View upcoming bookings
- View booking history
- Cancel booking
- Booking status handling (pending, canceled)

### 👤 Account Management
- View profile
- Logout securely

---

# 🔄 Application Flow

1. User registers or logs in.
2. JWT token is stored in localStorage.
3. If token exists → user is auto-authenticated.
4. User allows geolocation.
5. Nearby barbers are displayed using Google Places API.
6. User selects a barber and books a time slot.
7. Booking appears in:
   - Upcoming section
   - Booking history
8. User can cancel a booking.
9. Status updates accordingly.

---

# 🧠 User Stories

## Client

- As a user, I want to create an account so I can book appointments.
- As a user, I want to log in securely.
- As a user, I want my session to persist after refresh.
- As a user, I want to see nearby barbers based on my location.
- As a user, I want to search barbers by name or address.
- As a user, I want to book an appointment with a selected barber.
- As a user, I want to view my upcoming appointments.
- As a user, I want to cancel a booking.
- As a user, I want to view my booking history.

---

# 🛠 Tech Stack

## Frontend
- React (Vite)
- React Router
- Context API (Global State)
- Lucide Icons
- Custom CSS (Mobile-first design)

## Backend
- Python
- Flask
- SQLAlchemy
- JWT Authentication
- REST API architecture

## External APIs
- Google Places API (Nearby barbers)

---

# 📸 Screenshots

(Screenshots will be added soon)

---

# ⚙️ Installation & Setup

## Backend

```bash
pipenv install
pipenv run start
```

## Frontend

```bash
npm install
npm run dev
```

## Environment Variables

Create a `.env` file:

### Frontend
```
VITE_BACKEND_URL=your_backend_url
```

### Backend
```
JWT_SECRET_KEY=your_secret
DATABASE_URL=your_database_url
```

---

# 📌 Current Status

✔ Authentication complete  
✔ Persistent session working  
✔ Booking system complete  
✔ Cancel booking implemented  
✔ Google Places integration working  
✔ UI optimized (mobile-first)

---

# 🔮 Future Improvements (Phase 2)

- Online payments integration
- Barber dashboard with calendar view
- Rating & review system
- Real-time chat
- Push notifications
- Barber profile management panel

---

# 👨‍💻 Author

Felix Britez  
Full Stack Developer – 4Geeks Academy  
New York, USA