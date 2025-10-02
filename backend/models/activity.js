import {Schema, model} from 'mongoose';

const activitySchema = new Schema({
    user: {
        type: String,
        required: true
    },
    activity: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

export default model('Activity', activitySchema);
