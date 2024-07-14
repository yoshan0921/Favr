// Event listener to go to favor detail page

const favorDetail = document.getElementById("favorDetail");
favorDetail.addEventListener("click", () => {
  // Create a URLSearchParams object from the current URL
  var urlParams = new URLSearchParams(window.location.search);

  // Get the value of the 'taskid' parameter
  var taskid = urlParams.get("taskid");

  // Display favor detail page
  window.location.href = "../tasks/elder-favor.html?taskid=" + taskid;
});

// Event listener to go back to home

const backToHome = document.getElementById("backToHome");
backToHome.addEventListener("click", () => {
  window.location.href = "../dashboard.html";
});