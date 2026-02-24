const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { prepare } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get messages for a match
router.get('/:matchId', authMiddleware, (req, res) => {
    try {
        const { matchId } = req.params;
        const userId = req.user.id;

        // Verify user is part of this match
        const match = prepare(`
            SELECT * FROM matches
            WHERE id = ? AND (user1_id = ? OR user2_id = ?)
        `).get(matchId, userId, userId);

        if (!match) {
            return res.status(403).json({ error: 'Not authorized to view these messages' });
        }

        // Get messages
        const messages = prepare(`
            SELECT m.*, u.email as sender_email
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.match_id = ?
            ORDER BY m.created_at ASC
        `).all(matchId);

        // Mark messages as read
        prepare(`
            UPDATE messages
            SET read_at = CURRENT_TIMESTAMP
            WHERE match_id = ? AND sender_id != ? AND read_at IS NULL
        `).run(matchId, userId);

        res.json({ messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});

// Send a message
router.post('/:matchId', authMiddleware, (req, res) => {
    try {
        const { matchId } = req.params;
        const { content } = req.body;
        const senderId = req.user.id;

        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Verify user is part of this match
        const match = prepare(`
            SELECT * FROM matches
            WHERE id = ? AND (user1_id = ? OR user2_id = ?)
        `).get(matchId, senderId, senderId);

        if (!match) {
            return res.status(403).json({ error: 'Not authorized to send messages in this chat' });
        }

        // Insert message
        const messageId = uuidv4();
        prepare(`
            INSERT INTO messages (id, match_id, sender_id, content)
            VALUES (?, ?, ?, ?)
        `).run(messageId, matchId, senderId, content.trim());

        const message = prepare('SELECT * FROM messages WHERE id = ?').get(messageId);

        res.status(201).json({ message });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

module.exports = router;
