const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Attendance = require('../models/Attendance');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const { auth, requireSubscription } = require('../middleware/auth');
const CertificateGenerator = require('../utils/certificateGenerator');
const BlockchainUtils = require('../utils/blockchainUtils');
const { sendCertificateEmail } = require('../utils/emailUtils');
const RecoveryStatsManager = require('../utils/recoveryStats');

// Get user's attendance records
router.get('/my-records', auth, async (req, res) => {
    try {
        const records = await Attendance.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .populate('meetingId');

        res.json({
            success: true,
            records
        });
    } catch (error) {
        console.error('Get attendance records error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user's recovery stats (streaks and badges)
router.get('/my-stats', auth, async (req, res) => {
    try {
        res.json({
            success: true,
            streaks: req.user.streaks,
            badges: req.user.badges,
            attendanceCount: req.user.attendanceRecords.length,
            xp: req.user.xp,
            level: req.user.level
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching stats' });
    }
});

// Generate attendance certificate (requires active subscription)
router.post('/generate-certificate', auth, requireSubscription, async (req, res) => {
    try {
        const { meetingId, joinTime, leaveTime } = req.body;

        if (!meetingId || !joinTime || !leaveTime) {
            return res.status(400).json({ error: 'Meeting ID, join time, and leave time are required' });
        }

        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        // Calculate duration in seconds
        const duration = (new Date(leaveTime) - new Date(joinTime)) / 1000;

        // Minimum 30 minutes required for certificate
        if (duration < 1800) {
            return res.status(400).json({
                error: 'Minimum 30 minutes attendance required for certificate'
            });
        }

        // Generate unique certificate ID and verification code
        const certificateId = uuidv4();
        const verificationCode = CertificateGenerator.generateVerificationCode();

        // Create attendance record
        const attendance = new Attendance({
            userId: req.user._id,
            meetingId: meeting._id,
            certificateId,
            meetingType: meeting.type,
            meetingTitle: meeting.title,
            joinTime: new Date(joinTime),
            leaveTime: new Date(leaveTime),
            duration,
            verificationCode
        });

        await attendance.save();

        // Add to user's attendance records
        req.user.attendanceRecords.push({
            meetingId: meeting._id,
            date: new Date(joinTime),
            duration,
            certificateId
        });
        await req.user.save();

        // Update streaks and check badges
        const recoveryResult = await RecoveryStatsManager.updateStreak(req.user);

        // Generate PDF certificate
        const certificateData = {
            certificateId,
            verificationCode,
            userName: req.user.chatName,
            meetingType: meeting.type,
            meetingTitle: meeting.title,
            joinTime: new Date(joinTime),
            leaveTime: new Date(leaveTime),
            duration
        };

        const pdfResult = await CertificateGenerator.generateAttendanceCertificate(certificateData);

        // Update attendance record with PDF info
        attendance.pdfGenerated = true;
        attendance.pdfPath = pdfResult.filepath;
        await attendance.save();

        // Send certificate email (non-blocking)
        sendCertificateEmail(req.user.email, {
            meetingTitle: meeting.title,
            certificateId,
            duration
        }).catch(err => console.error('Certificate email error:', err));

        // Blockchain integration: Increment on-chain meetings if user has a passport
        let onChainTx = null;
        let tokenRewardTx = null;

        if (req.user.onChainPassportId) {
            onChainTx = await BlockchainUtils.incrementMeetings(req.user.onChainPassportId);
        }

        // Reward with tokens if wallet is connected
        if (req.user.walletAddress) {
            tokenRewardTx = await BlockchainUtils.rewardTokens(req.user.walletAddress, 10); // 10 REC tokens
        }

        res.json({
            success: true,
            message: 'Certificate generated successfully',
            recoveryData: recoveryResult,
            onChainUpdate: onChainTx ? 'success' : (req.user.onChainPassportId ? 'failed' : 'not_linked'),
            tokenReward: tokenRewardTx ? 'success' : (req.user.walletAddress ? 'failed' : 'not_linked'),
            onChainTx: onChainTx,
            tokenTx: tokenRewardTx,
            attendance: {
                id: attendance._id,
                certificateId,
                verificationCode,
                pdfUrl: pdfResult.url,
                meetingType: meeting.type,
                meetingTitle: meeting.title,
                duration: Math.round(duration / 60)
            }
        });
    } catch (error) {
        console.error('Generate certificate error:', error);
        res.status(500).json({ error: 'Server error generating certificate' });
    }
});


// Record User Mood
router.post('/mood', auth, async (req, res) => {
    try {
        const { mood, note } = req.body;
        if (!mood) return res.status(400).json({ error: 'Mood is required' });

        // Add to history
        req.user.moodHistory.push({
            mood,
            note: note || '',
            timestamp: new Date()
        });

        // Award XP for check-in (Daily Evolution)
        const xpResult = await RecoveryStatsManager.awardXP(req.user, 10, 'Daily Mood Check-in');

        await req.user.save();

        res.json({
            success: true,
            moodRecorded: true,
            xp: xpResult
        });
    } catch (error) {
        console.error('Mood record error:', error);
        res.status(500).json({ error: 'Server error recording mood' });
    }
});

// Link on-chain passport ID to user
router.post('/link-passport', auth, async (req, res) => {
    try {
        const { passportId } = req.body;
        if (!passportId) return res.status(400).json({ error: 'Passport ID required' });

        req.user.onChainPassportId = passportId;
        await req.user.save();

        res.json({
            success: true,
            message: 'Passport linked successfully',
            passportId
        });
    } catch (error) {
        console.error('Link passport error:', error);
        res.status(500).json({ error: 'Failed to link passport' });
    }
});

// Verify certificate
router.get('/verify/:certificateId', async (req, res) => {
    // ... (existing code)
});

// Get on-chain passport data
router.get('/passport/:passportId', auth, async (req, res) => {
    try {
        const data = await BlockchainUtils.getPassportData(req.params.passportId);
        if (!data) {
            return res.status(404).json({ error: 'Passport data not found' });
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch passport data' });
    }
});

// Download certificate PDF
router.get('/download/:certificateId', auth, async (req, res) => {
    try {
        const attendance = await Attendance.findOne({
            certificateId: req.params.certificateId,
            userId: req.user._id
        });

        if (!attendance) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        if (!attendance.pdfGenerated || !attendance.pdfPath) {
            return res.status(404).json({ error: 'PDF not available' });
        }

        res.download(attendance.pdfPath, `certificate_${attendance.certificateId}.pdf`);
    } catch (error) {
        console.error('Download certificate error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
