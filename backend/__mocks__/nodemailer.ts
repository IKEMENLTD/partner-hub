// Mock nodemailer for Jest tests
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'mock-message-id' });

const mockTransporter = {
  sendMail: mockSendMail,
  verify: jest.fn().mockResolvedValue(true),
};

const createTransport = jest.fn().mockReturnValue(mockTransporter);

export = {
  createTransport,
  __mockSendMail: mockSendMail,
  __mockTransporter: mockTransporter,
};
