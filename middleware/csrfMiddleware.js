// csrfMiddleware.js
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

// Middleware للكوكيز
export const cookieParserMiddleware = cookieParser();

// إعداد CSRF middleware مع كوكيز
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,      // الكوكيز غير قابلة للوصول من JS
    secure: false,       // ضع true عند استخدام HTTPS
    sameSite: 'strict'   // حماية إضافية من CSRF
  }
});

// Middleware لمعالجة أخطاء CSRF
export const csrfErrorHandler = (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ message: 'CSRF token غير صالح!' });
  }
  next(err);
};
