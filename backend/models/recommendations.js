import {Schema, model} from 'mongoose';

const recommendationsSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    basedOnFavourites: [{type: Schema.Types.ObjectId, ref: 'Resturant'}],
    newToYou: [{type: Schema.Types.ObjectId, ref: 'Resturant'}]
});

export default model('Recommendations', recommendationsSchema);
