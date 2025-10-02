import mongoose, { Schema, model } from 'mongoose';

const reservationSchema = new Schema({
   user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
   },
   resturant: {
    type: Schema.Types.ObjectId,
    ref: 'Resturant'
   },
   reservationDate: {
    type: String,
    required: true
   },
   reservationTime: {
    type: String,
    required: true
   },
   partySize: {
    type: Number,
    required: true
   },
   confirmationNumber: {
    type: String,
    required: true
   },
   sittingArea: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: { areaKey: "main-area", name: "Main Area", price: 0 }
   },
   preOrderedItems: [{ type: Schema.Types.ObjectId, ref: 'Menu' }],
   reservationStatus: {
    type: String,
    enum: ['confirmed', 'pending', 'no-show', 'payed'],
    default: 'pending'
   }
}, {timestamps: true});

export default model('Reservation', reservationSchema);
