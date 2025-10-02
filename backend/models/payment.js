import {Schema, model} from 'mongoose';

const paymentSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    reservation: {
        type: Schema.Types.ObjectId,
        ref: 'Reservation'
    },
    paymentMethod: {
        type: String,
        default: 'Mpesa'
    },
    payementStatus: {
        type: String,
        enum: ['pending', 'confirmed', 'failed'],
        default: 'pending'
    }
}, {timestamps: true});

export default model('Payment', paymentSchema);
