import mongoose from 'mongoose';
import SittingArea from '../models/sittingArea.js';
import dotenv from 'dotenv';

dotenv.config();

// Default sitting areas to seed
const defaultSittingAreas = [
    {
        name: "Main Area",
        description: "General dining area",
        price: 0,
        areaKey: "main-area",
        iconType: "table",
        isActive: true,
        restaurant: null // Global area
    },
    {
        name: "Window Area",
        description: "Tables near windows with natural light",
        price: 0,
        areaKey: "window-area",
        iconType: "window",
        isActive: true,
        restaurant: null
    },
    {
        name: "Private Booth",
        description: "Intimate dining for couples",
        price: 150,
        areaKey: "private-booth",
        iconType: "private",
        isActive: true,
        restaurant: null
    },
    {
        name: "VIP Section",
        description: "Premium dining experience",
        price: 300,
        areaKey: "vip-section",
        iconType: "vip",
        isActive: true,
        restaurant: null
    },
    {
        name: "Bar Counter",
        description: "High tables and bar stools",
        price: 0,
        areaKey: "bar-counter",
        iconType: "bar",
        isActive: true,
        restaurant: null
    },
    {
        name: "Garden View",
        description: "Tables overlooking the garden",
        price: 75,
        areaKey: "garden-view",
        iconType: "garden",
        isActive: true,
        restaurant: null
    }
];

async function seedSittingAreas() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/dinemate');
        console.log('Connected to MongoDB');

        // Check if sitting areas already exist
        const existingAreas = await SittingArea.find({});
        
        if (existingAreas.length > 0) {
            console.log('Sitting areas already exist. Skipping seed.');
            process.exit(0);
        }

        // Insert default sitting areas
        await SittingArea.insertMany(defaultSittingAreas);
        console.log('Default sitting areas seeded successfully!');

        // List all created areas
        const areas = await SittingArea.find({});
        console.log('\nCreated sitting areas:');
        areas.forEach(area => {
            console.log(`- ${area.name} (${area.areaKey}) - Ksh ${area.price}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error seeding sitting areas:', error);
        process.exit(1);
    }
}

// Run the seed function
seedSittingAreas();