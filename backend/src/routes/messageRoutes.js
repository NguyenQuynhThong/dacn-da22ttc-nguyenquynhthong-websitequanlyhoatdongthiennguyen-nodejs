// Routes cho tin nhắn
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middlewares/auth');

// Tất cả routes cần xác thực
router.use(authenticateToken);

// Routes cho user (TNV)
router.get('/conversations', messageController.getUserConversations);
router.get('/unread-count', messageController.getUnreadCount);
router.get('/contactable-orgs', messageController.getContactableOrganizations);
router.get('/search-orgs', messageController.searchOrganizations);
router.get('/with-org/:toChucId', messageController.getMessagesWithOrganization);
router.post('/to-org/:toChucId', messageController.sendMessageToOrganization);
router.delete('/conversation/:toChucId', messageController.deleteUserConversation);

// Routes cho tổ chức
router.get('/org/conversations', messageController.getOrgConversations);
router.get('/org/unread-count', messageController.getOrgUnreadCount);
router.get('/org/search-users', messageController.searchUsersForOrg);
router.get('/org/with-user/:userId', messageController.getOrgMessagesWithUser);
router.post('/org/to-user/:userId', messageController.sendOrgMessageToUser);
router.delete('/org/conversation/:userId', messageController.deleteOrgConversation);

module.exports = router;
