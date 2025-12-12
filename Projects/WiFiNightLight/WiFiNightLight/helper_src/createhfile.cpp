#include <iostream>
#include <fstream>

using namespace std;

int main(void)
{
  ifstream combined("combined.html");
  if (!combined)
  {
    cout << endl << "Could not open file combined.html." << endl;
    return 0;
  }
  ofstream index("mainpage.h");
  if (!index)
  {
    cout << endl << "Could not open file mainpage.h" << endl;
    index.close();
    return 0;
  }

  index << "#ifndef mainpage_h\n#define mainpage_h\n\nconst char MAIN_page[] PROGMEM = R\"=====(\n\n";
  index << combined.rdbuf();
  index << "\n\n)=====\";\n\n#endif";
  
  return 0;
}