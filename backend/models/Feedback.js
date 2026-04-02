import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" }
  },
  { timestamps: true }
);

feedbackSchema.index({ studentId: 1, subjectId: 1 }, { unique: true });

feedbackSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.student_id = ret.studentId.toString();
    ret.faculty_id = ret.facultyId.toString();
    ret.subject_id = ret.subjectId.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.studentId;
    delete ret.facultyId;
    delete ret.subjectId;
    return ret;
  }
});

export default mongoose.model("Feedback", feedbackSchema);
