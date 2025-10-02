import { Schema, model } from 'mongoose';
import { genSalt, hash } from 'bcrypt';

const resturantSchema = new Schema({
    resturantName: {
        type: String,
        required: true
    },
    cuisineType: {
        type: String,
        required: true
    },
    resturantAddress: {
        type: String,
        required: true
    },
    resturantPhone: {
        type: String,
        required: true
    },
    resturantEmail: {
        type: String,
        unique: true
    },
    businessOpenTime: { 
        type: String, 
        required: true 
    },
    businessCloseTime: { 
        type: String, 
        required: true 
    },
    mpesaNumber: {
        type: String
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
        default: 'pending'
    },
    resturantCapacity: {
        type: Number,
        required: true
    },
    initialCapacity: {
        type: Number
    },
    resturantImage: {
        type: String,
        default: ""
    },
    lastReset: { 
        type: Date, 
        default: Date.now 
    },
    password: {
        type: String
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
});

resturantSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await genSalt(10);
    this.password = await hash(this.password, salt);
});

resturantSchema.pre('findOneAndUpdate', async function(next) {
    const update = this.getUpdate();
    if (update.password) {
        const salt = await genSalt(10);
        update.password = await hash(update.password, salt);
        this.setUpdate(update);
    }
    next();
});

export default model('Resturant', resturantSchema);
