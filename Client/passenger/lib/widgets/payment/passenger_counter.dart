import 'package:flutter/material.dart';
import 'package:transit_lanka/shared/constants/colors.dart';

class PassengerCounter extends StatelessWidget {
  final int count;
  final ValueChanged<int> onChanged;
  final int minCount;
  final int maxCount;

  const PassengerCounter({
    Key? key,
    required this.count,
    required this.onChanged,
    this.minCount = 1,
    this.maxCount = 5,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Number of Passengers',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            Row(
              children: [
                IconButton(
                  onPressed:
                      count > minCount ? () => onChanged(count - 1) : null,
                  icon: const Icon(Icons.remove_circle_outline),
                  color: count > minCount
                      ? AppColors.primary
                      : Colors.grey.shade400,
                ),
                Container(
                  width: 40,
                  alignment: Alignment.center,
                  child: Text(
                    count.toString(),
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                IconButton(
                  onPressed:
                      count < maxCount ? () => onChanged(count + 1) : null,
                  icon: const Icon(Icons.add_circle_outline),
                  color: count < maxCount
                      ? AppColors.primary
                      : Colors.grey.shade400,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
