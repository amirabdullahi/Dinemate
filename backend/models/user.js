import { Schema, model } from 'mongoose';
import { genSalt, hash } from 'bcrypt';

const userSchema = new Schema({
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    age: {
        type: Number,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    mpesaNumbers: [Number],
    diningPreferences: {
        type: String
    },
    favouriteResturants: [{ type: Schema.Types.ObjectId, ref: 'Resturant' }],
    profilePicture: {
        type: String
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    onlineStatus: {
        type: Boolean,
        default: true
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await genSalt(10);
    this.password = await hash(this.password, salt);
});

export default model('User', userSchema);
