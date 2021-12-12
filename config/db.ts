import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!, {
      //   useCreateIndex: true,
      //   useNewUrlParser: true,
      //   useFindAndModify: true,
      //   useUnifiedTopology: true,
    });
  } catch (error) {
    console.log("Connection error", error);
  }

  const connection = mongoose.connection;
  if (connection.readyState >= 1) {
    console.log("connected to database");
    return;
  }

  connection.on("error", () => console.log("Connection faild"));
};

export default connectDB;
