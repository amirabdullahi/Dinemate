import User from '../models/user.js';
import Resturant from '../models/resturants.js';
import Reservation from '../models/reservations.js';
import Payment from '../models/payment.js';

class adminAnalyticsController {
    // ✅ 1. Total active users
  async totalActiveUsers(_, res) {
    try {
      const count = await User.countDocuments({ onlineStatus: true });
      res.json({ totalActiveUsers: count });
    } catch (error) {
      res.status(500).json({ message: "Error fetching total active users", error: error.message });
    }
  }

  // ✅ 2. Registered restaurants (approved only)
  async registeredResturants(_, res) {
    try {
      const count = await Resturant.countDocuments({ approvalStatus: "accepted" });
      res.json({ registeredResturants: count });
    } catch (error) {
      res.status(500).json({ message: "Error fetching registered restaurants", error: error.message });
    }
  }

  // ✅ 3. Total confirmed reservations
  async totalReservations(_, res) {
    try {
      const count = await Reservation.countDocuments({ reservationStatus: "confirmed" });
      res.json({ totalReservations: count });
    } catch (error) {
      res.status(500).json({ message: "Error fetching total reservations", error: error.message });
    }
  }

  // ✅ 4. Total revenue from bookings (confirmed payments × 1000)
  async totalRevenueFromBookings(_, res) {
    try {
      const count = await Payment.countDocuments({ payementStatus: "confirmed" });
      const revenue = count * 1000;
      res.json({ totalRevenueFromBookings: revenue });
    } catch (error) {
      res.status(500).json({ message: "Error calculating revenue from bookings", error: error.message });
    }
  }

  // ✅ 5. Total revenue from all pre-orders (across all reservations)
  async totalRevenueFromPreOrders(_, res) {
    try {
      const reservations = await Reservation.find().populate("preOrderedItems");
      
      let total = 0;
      reservations.forEach(r => {
        r.preOrderedItems.forEach(item => {
          total += item.itemPrice * (item.quantity || 1);
        });
      });

      res.json({ totalRevenueFromPreOrders: total });
    } catch (error) {
      res.status(500).json({ message: "Error calculating revenue from preorders", error: error.message });
    }
  }

  // ✅ 6. Total reservations grouped by restaurant
  async totalReservationsByResturant(_, res) {
      try {
        const aggregation = await Resturant.aggregate([
          {
            $lookup: {
              from: "reservations",
              localField: "_id",
              foreignField: "resturant",
              as: "reservations"
            }
          },
          {
            $project: {
              _id: 0,
              resturantId: "$_id",
              resturantName: "$resturantName",
              totalReservations: { $size: "$reservations" } // counts 0 if none
            }
          }
        ]);

        res.json({ reservationsByResturant: aggregation });
      } catch (error) {
        res.status(500).json({
          message: "Error fetching reservations by restaurant",
          error: error.message
        });
      }
  }

  // ✅ 7. User demographics (age distribution)
  async userDemographics(_, res) {
    try {
      const users = await User.find({}, "age"); // Only fetch age field

      const demographics = {
        "20-30": 0,
        "31-40": 0,
        "41-50": 0,
        "51+": 0,
      };

      users.forEach(u => {
        if (u.age) {
          if (u.age >= 20 && u.age <= 30) demographics["20-30"]++;
          else if (u.age >= 31 && u.age <= 40) demographics["31-40"]++;
          else if (u.age >= 41 && u.age <= 50) demographics["41-50"]++;
          else if (u.age >= 51) demographics["51+"]++;
        }
      });

      res.json({ demographics });
    } catch (error) {
      res.status(500).json({ message: "Error calculating user demographics", error: error.message });
    }
  }

  async userGrowth(_, res) {
    try {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // Aggregate users by month
      const monthlyData = await User.aggregate([
        {
          $match: {
            registrationDate: { $gte: startOfYear }, // Only current year
          },
        },
        {
          $group: {
            _id: { month: { $month: "$registrationDate" } },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { "_id.month": 1 },
        },
      ]);

      // Convert raw aggregation to a fixed 12-month dataset
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      let data = months.map((m, i) => {
        const found = monthlyData.find((d) => d._id.month === i + 1);
        return {
          month: m,
          count: found ? found.count : 0,
        };
      });

      // Calculate growth percentage (last 30 days vs previous 30 days)
      const last30 = new Date();
      last30.setDate(last30.getDate() - 30);

      const prev30 = new Date();
      prev30.setDate(prev30.getDate() - 60);

      const last30Count = await User.countDocuments({
        registrationDate: { $gte: last30 },
      });

      const prev30Count = await User.countDocuments({
        registrationDate: { $gte: prev30, $lt: last30 },
      });

      const growth =
        prev30Count === 0
          ? last30Count > 0
            ? 100
            : 0
          : Math.round(((last30Count - prev30Count) / prev30Count) * 100);

      res.json({
        growth: `${growth}%`,
        last30Days: last30Count,
        monthlyData: data,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  async bookingsOverTime(req, res) {
      try {
        // Get the month and year from query, default to current month
        const { month, year } = req.query;
        const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth(); // JS months 0-11
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        // Start and end of the month
        const startDate = new Date(targetYear, targetMonth, 1);
        const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

        const aggregation = await Reservation.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate } // filter reservations within the month
            }
          },
          {
            $group: {
              _id: {
                day: { $dayOfMonth: "$createdAt" },
                month: { $month: "$createdAt" },
                year: { $year: "$createdAt" }
              },
              totalBookings: { $sum: 1 }
            }
          },
          {
            $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
          },
          {
            $project: {
              _id: 0,
              date: {
                $dateFromParts: {
                  year: "$_id.year",
                  month: "$_id.month",
                  day: "$_id.day"
                }
              },
              totalBookings: 1
            }
          }
        ]);

        // Optional: Fill in days with 0 bookings for graph completeness
        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const result = [];
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(targetYear, targetMonth, day);
          const dayData = aggregation.find(a => a.date.getDate() === day);
          result.push({
            date: date.toISOString().split('T')[0], // format YYYY-MM-DD
            totalBookings: dayData ? dayData.totalBookings : 0
          });
        }

        res.json({ bookingsOverTime: result });
      } catch (error) {
        res.status(500).json({
          message: "Error fetching bookings over time",
          error: error.message
        });
      }
  }

  async revenueOverTime(req, res) {
    try {
      // Get month and year from query params, default to current month
      const { month, year } = req.query;
      const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth(); // JS months 0-11
      const targetYear = year ? parseInt(year) : new Date().getFullYear();

      const startDate = new Date(targetYear, targetMonth, 1);
      const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

      const aggregation = await Payment.aggregate([
        {
          $match: {
            payementStatus: "confirmed",
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { day: { $dayOfMonth: "$createdAt" }, month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
        },
        {
          $project: {
            _id: 0,
            date: { $dateFromParts: { year: "$_id.year", month: "$_id.month", day: "$_id.day" } },
            revenue: { $multiply: ["$count", 1000] } // multiply by 1000 per booking
          }
        }
      ]);

      // Fill in missing days with 0 revenue
      const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const result = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(targetYear, targetMonth, day);
        const dayData = aggregation.find(a => a.date.getDate() === day);
        result.push({
          date: date.toISOString().split('T')[0], // format YYYY-MM-DD
          revenue: dayData ? dayData.revenue : 0
        });
      }

      res.json({ revenueOverTime: result });
    } catch (error) {
      res.status(500).json({
        message: "Error calculating revenue over time",
        error: error.message
      });
    }
  }

}

export default new adminAnalyticsController();
