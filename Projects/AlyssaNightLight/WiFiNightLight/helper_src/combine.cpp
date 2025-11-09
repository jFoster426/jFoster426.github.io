// HTML Combiner
// Combine HTML and JS files into a single file.
// Create two files, index.html and script.js in the same directory.
// Insert <script>#####</script> into index.html, and this code will
// insert script.js into the location of the "#####".

#include <iostream>
#include <fstream>

using namespace std;

int main(void)
{
  ifstream index("index.html");
  if (!index)
  {
    cout << endl << "Could not open file index.html." << endl;
    return 0;
  }
  ifstream script("script.js");
  if (!script)
  {
    cout << endl << "Could not open file script.js." << endl;
    index.close();
    return 0;
  }
  ofstream output("combined.html");
  if (!output)
  {
    cout << endl << "Could not open file output.html." << endl;
    index.close();
    script.close();
    return 0;
  }
  char inByte, inByte2;
  int i = 0;
  while ((inByte = index.get()) != EOF)
  {
    if (inByte != '#')
    {
      i = 0;
    }
    else if (i == 4)
    {
      // Remove the four '#' characters.
      int pos = output.tellp();
      output.seekp(pos - 4);
      // Start the js on a new line.
      output << '\n';
      while ((inByte2 = script.get()) != EOF)
      {
        output << inByte2;
        cout << inByte2;
      }
      while ((inByte = index.get()) == '#');
      output << '\n';
    }
    else
    {
      i++;
    }
    output << inByte;
    cout << inByte;
  }
  cout << endl << "Files combined successfully." << endl;
  index.close();
  script.close();
  output.close();
  return 0;
}