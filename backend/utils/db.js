import { connect } from "mongoose";

const mongo_uri = 'mongodb://localhost:27017/dinemate'

const connectDB = async () => {
    try {
        await connect(mongo_uri);
        console.log('MongoDB Connected...');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
}

export default connectDB;
