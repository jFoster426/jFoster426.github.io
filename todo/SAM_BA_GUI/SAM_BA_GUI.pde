PImage download;
PImage open;
PImage settings;

float ds;
float os;
float ss;

boolean dPress = false;
boolean oPress = false;
boolean sPress = false;

String uploadFile = "";

ArrayList<String> validLines = new ArrayList<String>();

void openFolder()
{
  selectInput("Choose a file to upload:", "fileSelected");
}

void fileSelected(File selection)
{
  if (selection != null)
  {
    uploadFile = selection.getAbsolutePath();
  }
  loadSettings();
}

void uploadSAM_BA()
{
  // we don't probably need -c erase because erase pin has to be already triggered

  // run the commands in the terminal
  for (int i = 0; i < validLines.size(); i++)
  {
    String command = validLines.get(i);
    println(command);
    // each argument must be separated
    String[] commandSeparated = command.trim().split("\\s+");
    // pass each separated argument to ProcessBuilder

    ProcessBuilder builder = new ProcessBuilder(commandSeparated);
    // redirect error stream to the standard output stream, keep it all in one
    builder.redirectErrorStream(true);
    try
    {
      Process process = builder.start();
      InputStream sam_ba_output = process.getInputStream();
      int data;
      while (true)
      {
        // right now only some errors come out
        data = sam_ba_output.read();
        if (data == -1) break;
        print(char(data));
      }
      process.waitFor();
      println(process.exitValue());
      sam_ba_output.close();
    }
    catch (Exception e)
    {
      e.printStackTrace();
    }
  }
}

void loadSettings()
{
  String[] lines = loadStrings(sketchPath() + "\\settings.txt");

  validLines.clear();

  for (int i = 0; i < lines.length; i++)
  {
    if (lines[i].length() > 0)
    {
      if (lines[i].charAt(0) != '#')
      {
        // not a comment, not empty
        validLines.add(lines[i]);
      }
    }
  }

  for (int i = 0; i < validLines.size(); i++)
  {
    // format special characters
    if (validLines.get(i).indexOf("%bin%") != -1)
    {
      // insert the bin file here
      String tmp = validLines.get(i).replace("%bin%", uploadFile);
      validLines.remove(i);
      validLines.add(i, tmp);
    }

    if (validLines.get(i).indexOf("%path%") != -1)
    {
      // insert the application path here
      String tmp = validLines.get(i).replace("%path%", sketchPath());
      validLines.remove(i);
      validLines.add(i, tmp);
    }
  }
}

void openSettings() {
  ProcessBuilder builder = new ProcessBuilder("Notepad.exe", sketchPath() + "\\settings.txt");
  builder.redirectErrorStream(true);
  try
  {
    Process process = builder.start();
    process.waitFor();
  }
  catch (Exception e)
  {
    e.printStackTrace();
  }

  loadSettings();
}

void setup()
{
  size(300, 150);
  download = loadImage("down.png");
  open = loadImage("open.png");
  settings = loadImage("settings.png");

  loadSettings();
}

void draw()
{
  background(232);
  if (mouseX > 25 && mouseX < 125 && mouseY > 25 && mouseY < 125 && mousePressed == true && mouseButton == LEFT)
  {
    os = 10;
    oPress = true;
    dPress = false;
    sPress = false;
  } else
  {
    os = 0;
  }

  if (mouseX > 175 && mouseX < 275 && mouseY > 25 && mouseY < 125 && mousePressed == true && mouseButton == LEFT)
  {
    ds = 10;
    oPress = false;
    dPress = true;
    sPress = false;
  } else
  {
    ds = 0;
  }

  if (mouseX > 125 && mouseX < 175 && mouseY > 100 && mouseY < 150 && mousePressed == true && mouseButton == LEFT)
  {
    ss = 5;
    oPress = false;
    dPress = false;
    sPress = true;
  } else
  {
    ss = 0;
  }

  image(open, 25+(os/2), 25+(os/2), 100-os, 100-os);
  image(download, 175+(ds/2), 25+(ds/2), 100-ds, 100-ds);
  image(settings, 125+(ss/2), 100+(ss/2), 50-ss, 50-ss);

  if (mousePressed == false)
  {
    if (oPress == true)
    {
      openFolder();
      oPress = false;
    }
    if (dPress == true)
    {
      uploadSAM_BA();
      dPress = false;
    }
    if (sPress == true)
    {
      openSettings();
      sPress = false;
    }
  }
}
