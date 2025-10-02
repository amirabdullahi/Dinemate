import Reservation from '../models/reservations.js';
import Payment from '../models/payment.js'
import mongoose from "mongoose";

class resturantAnalyticsController {
    async averageSpend(req, res) {
        try {
            const { resturantId } = req.user;
            const reservations = await Reservation.find({
                resturant: resturantId,
                reservationStatus: "confirmed",
            }).populate("preOrderedItems user");

            console.log(reservations.length);

            let userTotals = {};
            reservations.forEach(r => {
                if (!r.user) return;
                let orderTotal = 0;
                r.preOrderedItems.forEach(item => {
                orderTotal += item.itemPrice * (item.quantity || 1);
                });
                userTotals[r.user._id] = (userTotals[r.user._id] || 0) + orderTotal;
            });
            console.log(userTotals);
            const average =
                Object.values(userTotals).reduce((a, b) => a + b, 0) / Object.keys(userTotals).length || 0;

            res.json({ averageSpendPerUser: average });
        } catch (error) {
            res.status(500).json({ message: "Error calculating average spend", error: error.message });
        }
    }

    async totalRevenue(req, res) {
        try {
            const { resturantId } = req.user;
            const reservations = await Reservation.find({
                resturant: resturantId,
                reservationStatus: "confirmed",
            }).populate("preOrderedItems");

            let totalRevenue = 0;
            reservations.forEach(r => {
                r.preOrderedItems.forEach(item => {
                    totalRevenue += item.itemPrice * 1;
                });
            });

            res.json({ totalRevenue });
        } catch (error) {
        res.status(500).json({ message: "Error calculating totalRevenue", error: error.message });
        }
    }

    async averageAge(req, res) {
        try {
        const { restaurantId } = req.params;
        const reservations = await Reservation.find({
            restaurant: restaurantId,
            reservationStatus: "payed",
        }).populate("user");

        const ages = reservations
            .map(r => r.user.age)
            .filter(age => age !== undefined && age !== null);

        const averageAge = ages.reduce((a, b) => a + b, 0) / ages.length || 0;

        res.json({ averageAge });
        } catch (error) {
        res.status(500).json({ message: "Error calculating averageAge", error: error.message });
        }
    }

    async noShowRate(req, res) {
        try {
            const { restaurantId } = req.user;
            const total = await Reservation.countDocuments({ restaurant: restaurantId });
            const noShows = await Reservation.countDocuments({
                restaurant: restaurantId,
                reservationStatus: "no-show",
            });

            const rate = total > 0 ? (noShows / total) * 100 : 0;
            res.json({ noShowRate: rate.toFixed(2) + "%" });
        } catch (error) {
            res.status(500).json({ message: "Error calculating no-show rate", error: error.message });
        }
    }

    async peakTimes(req, res) {
        try {
            const { restaurantId } = req.user;
            const reservations = await Reservation.find({ restaurant: restaurantId });

            const timeCounts = {};
            reservations.forEach(r => {
                timeCounts[r.reservationTime] = (timeCounts[r.reservationTime] || 0) + 1;
            });

            const sorted = Object.entries(timeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([time, count]) => ({ time, count }));

            res.json({ peakTimes: sorted });
        } catch (error) {
            res.status(500).json({ message: "Error calculating peak times", error: error.message });
        }
    }

    async popularMenuItems(req, res) {
        try {
            const { resturantId } = req.user;
            const reservations = await Reservation.find({
                resturant: resturantId,
                reservationStatus: { $in: ["confirmed", "payed"] },
            }).populate("preOrderedItems");

            const itemCounts = {};
            reservations.forEach(r => {
                r.preOrderedItems.forEach(item => {
                    itemCounts[item._id] = (itemCounts[item._id] || { name: item.itemName, count: 0 });
                    itemCounts[item._id].count += 1;
                });
            });

            const popular = Object.values(itemCounts).sort((a, b) => b.count - a.count);

            res.json({ popularMenuItems: popular });
        } catch (error) {
            res.status(500).json({ message: "Error fetching popular menu items", error: error.message });
        }
    }

    async getMonthlyRevenue(req, res) {
        try {
            const { resturantId } = req.user;
            const now = new Date();
            const lastYear = new Date();
            lastYear.setFullYear(now.getFullYear() - 1);


            // 1. Find confirmed payments from last 12 months
            const payments = await Payment.find({
                payementStatus: "confirmed",
                createdAt: { $gte: lastYear }
            }).populate({
                path: "reservation",
                match: { resturant: resturantId },
                populate: { path: "preOrderedItems", model: "Menu" }
            });

            console.log(payments);

            // 2. Aggregate by month
            const monthlyRevenueMap = {};

            payments.forEach(payment => {
            if (!payment.reservation) return;

            // Compute revenue from menu items
            let revenue = 0;
            if (payment.reservation.preOrderedItems?.length > 0) {
                revenue = payment.reservation.preOrderedItems.reduce((sum, item) => sum + (item.itemPrice || 0), 0);
            }

            // fallback: charge per person (if no preOrderedItems)
            if (revenue === 0 && payment.reservation.partySize) {
                revenue = payment.reservation.partySize * 500; // e.g. default seat fee (adjust as needed)
            }

            const createdAt = new Date(payment.createdAt);
            const monthKey = `${createdAt.getFullYear()}-${createdAt.getMonth() + 1}`;

            if (!monthlyRevenueMap[monthKey]) {
                monthlyRevenueMap[monthKey] = 0;
            }
            monthlyRevenueMap[monthKey] += revenue;
            });

            // 3. Format last 12 months
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            const formatted = [];
            for (let i = 11; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
                formatted.push({
                    month: months[date.getMonth()],
                    year: date.getFullYear(),
                    revenue: monthlyRevenueMap[key] || 0
                });
            }

            // 4. Total revenue
            const totalRevenue = formatted.reduce((sum, m) => sum + m.revenue, 0);

            res.status(200).json({
                totalRevenue,
                months: formatted
            });

        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async confirmedReservations(req, res) {
        try {
            const { resturantId } = req.user; 
            const confirmed = await Reservation.countDocuments({
                resturant: resturantId,
                reservationStatus: "confirmed",
            });

            res.json({ confirmedReservations: confirmed });
        } catch (error) {
            res.status(500).json({ message: "Error counting confirmed reservations", error: error.message });
        }
    }

    async customerDemographics(req, res) {
        try {
            const { restaurantId } = req.user;

            const reservations = await Reservation.find({ restaurant: restaurantId })
            .populate("user");

            const demographics = {
            "20-30": 0,
            "31-40": 0,
            "41-50": 0,
            "51+": 0,
            };

            reservations.forEach(r => {
            const age = r.user?.age;
            if (age) {
                if (age >= 20 && age <= 30) demographics["20-30"]++;
                else if (age >= 31 && age <= 40) demographics["31-40"]++;
                else if (age >= 41 && age <= 50) demographics["41-50"]++;
                else if (age >= 51) demographics["51+"]++;
            }
            });

            res.json({ demographics });
        } catch (error) {
            res.status(500).json({ 
            message: "Error calculating customer demographics", 
            error: error.message 
            });
        }
    }

    async getBookingFrequency(req, res) {
        try {
            const { resturantId } = req.user;

            // Calculate the date 7 days ago
            const today = new Date();
            const past7Days = new Date(today);
            past7Days.setDate(today.getDate() - 6);

            // Convert to YYYY-MM-DD
            const formatDate = (date) => {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const dd = String(date.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
            };

            const startDate = formatDate(past7Days);
            const endDate = formatDate(today);

            // Aggregate reservations
            const data = await Reservation.aggregate([
            {
                $match: {
                resturant: new mongoose.Types.ObjectId(resturantId),
                reservationDate: { $gte: startDate, $lte: endDate },
                reservationStatus: "confirmed",
                },
            },
            {
                $group: {
                _id: "$reservationDate",
                count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
            ]);

            // Convert aggregation result to map for easy lookup
            const countMap = {};
            data.forEach((d) => {
            countMap[d._id] = d.count;
            });

            // Build full 7-day range with missing days filled in
            const result = [];
            for (let i = 0; i < 7; i++) {
            const date = new Date(past7Days);
            date.setDate(past7Days.getDate() + i);
            const formatted = formatDate(date);

            result.push({
                date: formatted,
                count: countMap[formatted] || 0,
            });
            }

            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getPeakHours(req, res) {
        try {
            const { resturantId } = req.user;

            const data = await Reservation.aggregate([
            {
                $match: {
                resturant: new mongoose.Types.ObjectId(resturantId),
                reservationStatus: "confirmed",
                reservationTime: { $exists: true, $ne: "" } // ensure it's set
                },
            },
            {
                $addFields: {
                // Extract first 2 chars from "HH:mm" safely
                hourStr: { $substrBytes: ["$reservationTime", 0, 2] }
                }
            },
            {
                $addFields: {
                hour: { $toInt: "$hourStr" }
                }
            },
            {
                $group: {
                _id: "$hour",
                count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } }
            ]);

            // Fill missing hours with 0
            const result = [];
            for (let i = 0; i < 24; i++) {
            const found = data.find(d => d._id === i);
            result.push({ hour: i, count: found ? found.count : 0 });
            }

            res.json(result);
        } catch (err) {
            console.error("Error in getPeakHours:", err);
            res.status(500).json({ error: err.message });
        }
    }
}

export default new resturantAnalyticsController();
