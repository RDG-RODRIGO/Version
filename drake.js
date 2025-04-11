const fs = require("fs-extra");
const axios = require("axios");
const { loadImage, createCanvas } = require("canvas");

module.exports = {
  config: {
    name: "drake",
    version: "1.2",
    author: "Jubayer", 
    countDown: 10,
    role: 0, 
    shortDescription: "Create a Drake meme",
    longDescription: "Generates a Drake meme with two text inputs separated by '+'. Example: !drake No way + Yes way",
    category: "image",
    guide: "{p} <text1> + <text2>"
  },

  wrapText: (ctx, text, maxWidth) => {
    return new Promise((resolve) => {
      if (ctx.measureText(text).width < maxWidth) return resolve([text]);
      if (ctx.measureText("W").width > maxWidth) return resolve(null);
      const words = text.split(" ");
      const lines = [];
      let line = "";
      while (words.length > 0) {
        let split = false;
        while (ctx.measureText(words[0]).width >= maxWidth) {
          const temp = words[0];
          words[0] = temp.slice(0, -1);
          if (split) words[1] = `${temp.slice(-1)}${words[1]}`;
          else {
            split = true;
            words.splice(1, 0, temp.slice(-1));
          }
        }
        if (ctx.measureText(`${line}${words[0]}`).width < maxWidth)
          line += `${words.shift()} `;
        else {
          lines.push(line.trim());
          line = "";
        }
        if (words.length === 0) lines.push(line.trim());
      }
      return resolve(lines);
    });
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const pathImg = __dirname + "/cache/drake.png";
    const pathFont = __dirname + "/cache/SVN-Arial2.ttf";

    try {
      // Check if arguments are provided
      if (!args.length) {
        return api.sendMessage(
          "Please provide two texts separated by '+'. Example: !drake No way + Yes way",
          threadID,
          messageID
        );
      }

      // Parse input
      const text = args.join(" ").trim().replace(/\s+/g, " ").split("+");
      if (text.length < 2 || !text[0] || !text[1]) {
        return api.sendMessage(
          "Invalid input. Use: !drake <text1> + <text2>",
          threadID,
          messageID
        );
      }

      // Download and cache font if not exists
      if (!fs.existsSync(pathFont)) {
        const fontData = (
          await axios.get(
            "https://drive.google.com/u/0/uc?id=11YxymRp0y3Jle5cFBmLzwU89XNqHIZux&export=download",
            { responseType: "arraybuffer" }
          )
        ).data;
        fs.writeFileSync(pathFont, Buffer.from(fontData));
      }

      // Download image
      const imageData = (
        await axios.get("https://i.imgur.com/mK9d7UE.jpeg", {
          responseType: "arraybuffer",
        })
      ).data;
      fs.writeFileSync(pathImg, Buffer.from(imageData));

      // Create canvas
      const baseImage = await loadImage(pathImg);
      const canvas = createCanvas(baseImage.width, baseImage.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

      // Register font
      const Canvas = require("canvas");
      Canvas.registerFont(pathFont, { family: "SVN-Arial2" });

      // Apply text
      ctx.font = "35px SVN-Arial2";
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      const line1 = await this.wrapText(ctx, text[0].trim(), 400);
      const line2 = await this.wrapText(ctx, text[1].trim(), 464);
      if (!line1 || !line2) {
        return api.sendMessage(
          "Text is too long to fit in the image!",
          threadID,
          messageID
        );
      }
      ctx.fillText(line1.join("\n"), 188, 349);
      ctx.fillText(line2.join("\n"), 532, 349);

      // Save and send image
      const imageBuffer = canvas.toBuffer();
      fs.writeFileSync(pathImg, imageBuffer);
      return api.sendMessage(
        { attachment: fs.createReadStream(pathImg) },
        threadID,
        () => fs.unlinkSync(pathImg),
        messageID
      );
    } catch (error) {
      console.error("Drake meme error:", error);
      return api.sendMessage(
        "An error occurred while generating the meme. Please try again later.",
        threadID,
        messageID
      );
    }
  }
};

// Apply GoatWrapper to allow command with or without prefix
const wrapper = new GoatWrapper(module.exports);
wrapper.applyNoPrefix({ allowPrefix: true });
