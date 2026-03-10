# 💈 BarberOn

BarberOn is a full-stack web application that connects clients with nearby barbers, allowing users to discover services, explore barber profiles, and book appointments through a modern mobile-first interface.

This project was developed as the final full-stack project for the 4Geeks Academy bootcamp.

---

## Project Description

BarberOn is a full-stack platform that helps users find nearby barbers using an interactive map. Users can explore barber profiles, view services, and book appointments easily.

The goal of the project is to simplify the process of finding barbers nearby and modernize the booking experience.

---

## Main Features

- User registration
- Secure login with JWT authentication
- Session persistence
- Nearby barbers displayed on an interactive map
- Barber profile pages
- Booking system
- Messaging inbox structure
- Modern dark themed UI
- Mobile-first design

---

## Technologies Used

### Frontend

- React
- React Router
- JavaScript
- CSS
- Lucide Icons

### Backend

- Flask
- Python
- SQLAlchemy
- JWT Authentication

### Maps

- MapLibre
- MapTiler

### Database

- PostgreSQL / SQLite

---

## Project Architecture

The application follows a full-stack architecture separating frontend and backend.

### Frontend (React)

Responsible for:

- User interface
- Navigation
- API consumption
- Client-side logic

### Backend (Flask)

Responsible for:

- Authentication with JWT
- Business logic
- REST API endpoints
- Database management

---

## Installation

### Clone the repository

git clone https://github.com/your-username/barberon.git

---

### Backend

Install dependencies

pipenv install

Run server

pipenv run start

---

### Frontend

Install dependencies

npm install

Run development server

npm run dev

---

## Environment Variables

The project uses environment variables.

Example:

VITE_BACKEND_URL=
MAPTILER_KEY=
JWT_SECRET=

---

## MVP (Minimum Viable Product)

The current MVP allows users to:

- Create an account
- Log in securely
- Authenticate using JWT
- View nearby barbers on a map
- Explore barber profiles
- Book appointments
- Access the messaging inbox

---

## Future Improvements

- Real-time chat
- Barber dashboard
- Payment integration
- Reviews and ratings
- Advanced filters
- Real-time availability

---

## Author

Felix Britez  
Full-Stack Developer
