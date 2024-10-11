const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const getLogger = require("./logger.js");
const logger = getLogger();

async function addAttachmentToCase(
  url,
  email,
  password,
  attachmentPath,
  resultId
) {
  /*
   * This function uploads the provided attachment to the TestRail run
   * for the given test case.
   * Attachment represents a screenshot or a video.
   * */

  try {
    logger.debug(`Uploading "${attachmentPath}" attachment.`);
    let attachment = fs.createReadStream(attachmentPath);
    let data = new FormData();
    data.append("attachment", attachment);
    let uploadUrl = `${url}/index.php?/api/v2/add_attachment_to_result/${resultId}`;

    const response = await axios.post(uploadUrl, data, {
      headers: {
        "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
      },
      auth: {
        username: email,
        password: password,
      },
    });
    // logger.debug(JSON.stringify(response.data));
    if (response.status === 200) {
      logger.debug(`Uploaded "${attachmentPath}" attachment.`);
    } else {
      logger.warn(`Failed to upload "${attachmentPath}" attachment.`);
    }
  } catch (error) {
    logger.warn(error);
  }
}

module.exports = {
  addAttachmentToCase,
};
