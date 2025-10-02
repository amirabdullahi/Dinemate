import { Schema, model } from 'mongoose';

const menuSchema = new Schema({
    resturant: {
        type: Schema.Types.ObjectId,
        ref: 'Resturant',
        required: true
    },
    itemImage: {
        type: String,
        required: true
    },
    itemName: {
        type: String,
        required:true,
        default: 'item name'
    },
    itemStatus: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    itemCount: {
        type: Number,
        default: 0
    },
    itemDescription: {
        type: String,
        required: true
    },
    itemPrice: {
        type: Number,
        required: true
    },
    itemType: {
        type: String,
        enum: ['main course', 'appetizer', 'starter', 'dessert'],
        required: true
    },
    ingredients: [String]
});

export default model('Menu', menuSchema);
