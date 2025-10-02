import { Schema, model } from 'mongoose';

const sittingAreaSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        default: 0,
        min: 0
    },
    areaKey: {
        type: String,
        required: true,
        unique: true
    },
    iconType: {
        type: String,
        default: 'table'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    restaurant: {
        type: Schema.Types.ObjectId,
        ref: 'Resturant',
        default: null // null means it's a global sitting area available to all restaurants
    }
}, { timestamps: true });

export default model('SittingArea', sittingAreaSchema);