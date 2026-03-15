const College = require('../models/College.model');
const User    = require('../models/User.model');
const ApiError    = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { clearCache } = require('../middleware/cache.middleware');
const notif          = require('../services/notification.service');

const getMyCollege = async (req, res, next) => {
  try {
    const college = await College.findOne({ createdBy: req.user.id });
    if (!college) return ApiResponse.success(res, 'No college found', null);
    ApiResponse.success(res, 'College fetched', college);
  } catch (err) {
    next(err);
  }
};

const createCollege = async (req, res, next) => {
  try {
    const { name, email, phone, address, website, description } = req.body;

    const exists = await College.findOne({ email });
    if (exists) throw ApiError.conflict('College email already registered');

    const logoUrl = req.file ? `uploads/college-logos/${req.file.filename}` : undefined;

    const college = await College.create({
      name, email, phone, address, website, description, logoUrl,
      createdBy: req.user.id,
    });

    // Associate faculty with this college
    if (req.user.role === 'faculty') {
      await User.findByIdAndUpdate(req.user.id, { college: college._id });
    }

    clearCache('/api/colleges');

    // Alert all superadmins about the new college registration
    const admins = await User.find({ role: 'superadmin', isActive: true }, '_id').lean();
    if (admins.length) {
      await notif.newCollegeRegistered(admins.map((a) => a._id), college);
    }

    ApiResponse.created(res, 'College submitted for approval', college);
  } catch (err) {
    next(err);
  }
};

const getColleges = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const filter = {};

    // Non-admins only see approved colleges
    if (req.user?.role !== 'superadmin') filter.status = 'approved';
    else if (status) filter.status = status;

    if (search) filter.$text = { $search: search };

    const skip = (page - 1) * limit;
    const [colleges, total] = await Promise.all([
      College.find(filter)
        .select('-createdBy -approvedBy')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      College.countDocuments(filter),
    ]);

    ApiResponse.paginated(res, 'Colleges fetched', colleges, {
      total, page: Number(page), limit: Number(limit),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

const getCollegeById = async (req, res, next) => {
  try {
    const college = await College.findById(req.params.id).populate('createdBy', 'name email');
    if (!college) throw ApiError.notFound('College not found');
    ApiResponse.success(res, 'College fetched', college);
  } catch (err) {
    next(err);
  }
};

const updateCollege = async (req, res, next) => {
  try {
    const college = await College.findById(req.params.id);
    if (!college) throw ApiError.notFound('College not found');

    if (
      req.user.role !== 'superadmin' &&
      college.createdBy.toString() !== req.user.id
    ) throw ApiError.forbidden();

    const allowed = ['name', 'phone', 'address', 'website', 'description'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) college[f] = req.body[f]; });
    if (req.file) college.logoUrl = `uploads/college-logos/${req.file.filename}`;

    await college.save();
    clearCache('/api/colleges');
    ApiResponse.success(res, 'College updated', college);
  } catch (err) {
    next(err);
  }
};

// Faculty submits an edit request for an already-verified college
const submitCollegeEdit = async (req, res, next) => {
  try {
    const college = await College.findOne({ createdBy: req.user.id });
    if (!college) throw ApiError.notFound('College not found');
    if (college.verificationStatus !== 'verified')
      throw ApiError.badRequest('Only verified colleges can submit edit requests');
    if (college.editStatus === 'pending')
      throw ApiError.conflict('An edit request is already pending approval');

    const { name, email, phone, website, description, address } = req.body;
    college.pendingEdit = {
      name:        name        || college.name,
      email:       email       || college.email,
      phone:       phone       ?? college.phone,
      website:     website     ?? college.website,
      description: description ?? college.description,
      address:     address     ?? college.address,
      logoUrl:     req.file ? `uploads/college-logos/${req.file.filename}` : college.logoUrl,
      submittedAt: new Date(),
    };
    college.editStatus          = 'pending';
    college.editRejectionReason = null;
    await college.save();

    // Notify all superadmins
    const admins = await User.find({ role: 'superadmin', isActive: true }, '_id').lean();
    if (admins.length) {
      await notif.newCollegeEditPending(admins.map((a) => a._id), college);
    }

    ApiResponse.success(res, 'Edit request submitted for approval', college);
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyCollege, createCollege, getColleges, getCollegeById, updateCollege, submitCollegeEdit };
