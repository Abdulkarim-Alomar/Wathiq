import multer from 'multer';
import path from 'path';

// تحديد مكان حفظ الصور
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/clients/');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

// قبول الصور فقط
function fileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!allowed.includes(file.mimetype)) {
    cb(new Error('Invalid image type'), false);
  } else {
    cb(null, true);
  }
}

export const uploadClientImage = multer({
  storage,
  fileFilter
});
