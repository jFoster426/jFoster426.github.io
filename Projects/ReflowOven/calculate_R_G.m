close all;
clear;
clc;

% Circuit parameters
R_L = 26.5;     % Element cold resistance
V_T1 = 0.85;    % Vt of T1235T-8T
R_D1 = 0.037;   % Rd of T1235T-8T
V_T2 = 1;       % Vt of MOC3063 (approximated from figures)
R_D2 = 3.75;    % Rd of MOC3063 (approximated from figures)

% Triac Parameters
V_GT = [0.2 1.3];
I_GT = [0.00175 0.035];
I_L = 0.06;

% Solve for minimum value of R_G (maximum of these two with varying triac parameters)
R_Gmin1 = ((I_L.*R_L)+(I_L.*R_D1)-((I_GT(1).*R_L)+(I_GT(1).*R_D2)+V_T2+V_GT(1)-V_T1))./I_GT(1);
R_Gmin2 = ((I_L.*R_L)+(I_L.*R_D1)-((I_GT(2).*R_L)+(I_GT(2).*R_D2)+V_T2+V_GT(2)-V_T1))./I_GT(2);
R_Gmin = max(R_Gmin1, R_Gmin2);
disp(R_Gmin);

R_G = R_Gmin:1:2000;

% Solve for V_S based on R_G
V_Smin = I_GT(1).*(R_G+R_L+R_D2)+V_T2+V_GT(1);
V_Smax = I_GT(2).*(R_G+R_L+R_D2)+V_T2+V_GT(2);

% Display the results
figure;
hold on;
plot(R_G, V_Smin);
plot(R_G, V_Smax);
grid on;
xlabel('R_G (Ohms)');
ylabel('V_S At Trip Point (Volts)');
title('Main Triac Trip Point Limits Based on R_G and R_L');
legend('I_{GT(min)}', 'I_{GT(max)}');

% Plot what happens with increasing R_L
figure;
hold on;
for i = 1:10
  R_L = R_L .* 1.4;
  V_Smin = I_GT(1).*(R_G+R_L+R_D2)+V_T2+V_GT(1);
  V_Smax = I_GT(2).*(R_G+R_L+R_D2)+V_T2+V_GT(2);
  plot(R_G, V_Smin);
  plot(R_G, V_Smax);
end
grid on;
xlabel('R_G (Ohms)');
ylabel('V_S At Trip Point (Volts)');
title('Main Triac Trip Point Limits Based on R_G and R_L');
% Example using annotation
annotation("arrow", [0.5 0.5], [0.5 0.75], "linewidth", 1, "color", "b");
text(1325, 62, "Increasing R_L", ...
       "horizontalalignment", "left", ...
       "verticalalignment", "middle", ...
       "fontsize", 20, "color", "b");
