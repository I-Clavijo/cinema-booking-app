const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const connection = mongoose.connection;
connection.once('open', () => {
    console.log('MongoDB database connection established successfully');
});

// User Schema and Model
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    userPassword: { type: String, required: true, }
});

const User = mongoose.model('User', userSchema);

// Booking Schema and Model
const bookingSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    screeningTime: { type: String, required: true },
    seats: [{ type: String }],
    status: { type: String, default: 'pending' }, // pending, confirmed
    createdAt: { type: Date, default: Date.now },
});

const Booking = mongoose.model('Booking', bookingSchema);

// Routes
app.post('/register', async (req, res) => {
    const { userId, userPassword } = req.body;
    try {
        const newUser = new User({ userId, userPassword });
        await newUser.save();
        res.json({ message: 'User registered' });
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

// Add login endpoint
app.post('/login', async (req, res) => {
    const { userId, userPassword } = req.body;
    try {
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        if (user.userPassword !== userPassword) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        res.json({ message: 'Login successful', userId: user.userId });
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

app.post('/book', async (req, res) => {
    const { userId, screeningTime, seats } = req.body;
    try {
        const newBooking = new Booking({ userId, screeningTime, seats });
        await newBooking.save();

        setTimeout(async () => {
            const booking = await Booking.findById(newBooking._id);
            if (booking && booking.status === 'pending') {
                await Booking.updateOne({ _id: newBooking._id }, { status: 'expired' });
            }
        }, 60 * 100); // 15* 60 * 1000

        res.json({ message: 'Booking pending', bookingId: newBooking._id });
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

app.post('/confirm/:bookingId', async (req, res) => {
    try {
        await Booking.updateOne({ _id: req.params.bookingId }, { status: 'confirmed' });
        res.json({ message: "Booking confirmed" });
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

app.get('/bookings/:userId', async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.params.userId });
        res.json(bookings);
    } catch (err) {
        res.status(400).json("Error: " + err);
    }
});

// Add delete booking endpoint
app.delete('/bookings/:bookingId', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Only allow deletion of pending bookings
        if (booking.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending bookings can be deleted' });
        }

        await Booking.findByIdAndDelete(req.params.bookingId);
        res.json({ message: 'Booking deleted successfully' });
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});